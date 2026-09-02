import { beforeEach, describe, expect, it } from 'vitest';
import { CreateOrder } from '@/application/use-cases/orders/create-order';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates, ValidationError } from '@/core';
import { FakeGeocoder, FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * Retirada no balcão.
 *
 * Um pedido de retirada não é um pedido de entrega com o endereço da loja. Ele
 * não entra em rota, não paga taxa, e o "entregue" acontece quando o cliente
 * aparece — três diferenças que precisam viver num campo, não na interpretação
 * de cada tela.
 */
const clock = new FixedClock(new Date('2026-09-02T18:00:00Z'));
const PONTO = Coordinates.create(-22.2402, -45.9481);

let db: InMemoryDatabase;

function criar() {
  return new CreateOrder(
    new InMemoryUnitOfWork(db),
    new FakeGeocoder(PONTO),
    new SequentialIds('order'),
    clock,
    'est-1',
  );
}

beforeEach(() => {
  db = newDatabase();
  db.deliveryFeeBands = [];
});

describe('taxa', () => {
  it('retirada não paga entrega', async () => {
    /*
     * Cobrar por uma entrega que não vai acontecer é o erro que o cliente
     * descobre no balcão, com o pedido pronto — e aí a conversa é sobre
     * devolver dinheiro.
     */
    const pedido = await criar().execute({
      customerName: 'Ana',
      address: 'Rua Comendador José Garcia, 100 - Centro, Pouso Alegre',
      amountReais: 50,
      fulfillment: 'PICKUP',
    });

    expect(pedido.deliveryFee.cents).toBe(0);
    expect(pedido.isPickup).toBe(true);
  });

  it('entrega continua cobrando normalmente', async () => {
    const pedido = await criar().execute({
      customerName: 'Bruno',
      address: 'Rua das Flores, 10 - Centro, Pouso Alegre',
      amountReais: 50,
      deliveryFeeReais: 8,
    });

    expect(pedido.deliveryFee.cents).toBe(800);
    expect(pedido.isPickup).toBe(false);
  });
});

describe('rota', () => {
  it('recusa pedido de retirada no planejamento', async () => {
    /*
     * Recusado no caso de uso, e não só escondido da tela: importação de
     * marketplace e outra aba chegam por caminhos diferentes. Pedido de balcão
     * no baú do motoboy é uma entrega que ninguém pediu.
     */
    const entrega = makeOrder('order-1', PONTO);
    const balcao = makeOrder('order-2', PONTO, { fulfillment: 'PICKUP' });
    db.orders.set(entrega.id, entrega);
    db.orders.set(balcao.id, balcao);

    const plan = new PlanRoute(
      new InMemoryUnitOfWork(db),
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('route'),
      clock,
    );

    await expect(
      plan.execute({
        orderIds: [entrega.id, balcao.id],
        courierId: [...db.couriers.values()][0].id,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('a entrega sozinha continua roteirizando', async () => {
    const entrega = makeOrder('order-1', PONTO);
    db.orders.set(entrega.id, entrega);

    const rota = await new PlanRoute(
      new InMemoryUnitOfWork(db),
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('route'),
      clock,
    ).execute({ orderIds: [entrega.id], courierId: [...db.couriers.values()][0].id });

    expect(rota.stops).toHaveLength(1);
  });
});
