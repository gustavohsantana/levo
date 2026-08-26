import { beforeEach, describe, expect, it } from 'vitest';
import { AdvanceOrderStage } from '@/application/use-cases/orders/advance-order-stage';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Address, Coordinates, OrderNotPendingError } from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * As etapas de preparo, que viram as colunas do painel.
 *
 * "Aceitei" e "saiu da cozinha" são decisões do lojista, não estados que o
 * sistema deduz — e, quando o pedido veio de marketplace, viram aviso lá fora,
 * para o cliente ver o pedido andar sem ninguém dar baixa duas vezes.
 */
let db: InMemoryDatabase;
let uow: InMemoryUnitOfWork;
let avancar: AdvanceOrderStage;
let clock: FixedClock;

beforeEach(() => {
  db = newDatabase();
  uow = new InMemoryUnitOfWork(db);
  clock = new FixedClock(new Date('2026-08-26T20:00:00Z'));
  avancar = new AdvanceOrderStage(uow, clock);
});

function pedido(overrides: Parameters<typeof makeOrder>[2] = {}) {
  const order = makeOrder('order-1', Coordinates.create(-22.23, -45.93), overrides);
  db.orders.set(order.id, order);
  return order;
}

const avisos = () => [...db.marketplace.values()];

describe('etapas do pedido', () => {
  it('começa em NOVO', () => {
    expect(pedido().stage).toBe('NOVO');
  });

  it('aceitar move para MONTANDO', async () => {
    const order = pedido();

    await avancar.execute(order.id, 'CONFIRMED');

    expect(db.orders.get(order.id)!.stage).toBe('MONTANDO');
    expect(db.orders.get(order.id)!.confirmedAt).toEqual(clock.now());
  });

  it('marcar pronto move para PRONTO', async () => {
    const order = pedido();

    await avancar.execute(order.id, 'READY');

    expect(db.orders.get(order.id)!.stage).toBe('PRONTO');
  });

  it('marcar pronto sem ter aceitado confirma junto', async () => {
    // Pular a etapa acontece na correria; recusar com "confirme antes" seria o
    // sistema brigando com quem está trabalhando.
    const order = pedido();

    await avancar.execute(order.id, 'READY');

    expect(db.orders.get(order.id)!.confirmedAt).not.toBeNull();
  });

  it('não reescreve o carimbo de quem já foi aceito', async () => {
    // O primeiro carimbo é o que conta o tempo de preparo de verdade.
    const order = pedido();
    await avancar.execute(order.id, 'CONFIRMED');
    const primeiro = db.orders.get(order.id)!.confirmedAt;

    clock.advance(10 * 60_000);
    await avancar.execute(order.id, 'CONFIRMED');

    expect(db.orders.get(order.id)!.confirmedAt).toEqual(primeiro);
  });

  it('avisa o marketplace ao aceitar', async () => {
    const order = pedido({ source: 'IFOOD', externalId: 'ext-1' });

    await avancar.execute(order.id, 'CONFIRMED');

    expect(avisos()).toContainEqual({
      establishmentId: 'est-1',
      provider: 'IFOOD',
      externalOrderId: 'ext-1',
      command: 'CONFIRM',
    });
  });

  it('avisa o marketplace ao marcar pronto', async () => {
    const order = pedido({ source: 'AIQFOME', externalId: '140036851' });

    await avancar.execute(order.id, 'READY');

    expect(avisos().some((a) => a.command === 'READY')).toBe(true);
  });

  it('não avisa ninguém sobre pedido digitado à mão', async () => {
    const order = pedido();

    await avancar.execute(order.id, 'CONFIRMED');

    expect(avisos()).toEqual([]);
  });

  it('recusa avançar pedido que já saiu para entrega', async () => {
    const order = pedido();
    const planRoute = new PlanRoute(
      uow,
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('r'),
      clock,
    );
    await planRoute.execute({ orderIds: [order.id], courierId: 'courier-1' });

    await expect(avancar.execute(order.id, 'CONFIRMED')).rejects.toThrow(
      OrderNotPendingError,
    );
  });

  it('pedido em rota sai das colunas de preparo', async () => {
    const order = pedido();
    const planRoute = new PlanRoute(
      uow,
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('r'),
      clock,
    );
    await planRoute.execute({ orderIds: [order.id], courierId: 'courier-1' });

    expect(db.orders.get(order.id)!.stage).toBe('EM_ROTA');
  });
});

/**
 * Corrigir o endereço quando o mapa não o encontrou.
 *
 * Arrastar um alfinete resolve o pino e deixa o endereço errado — e o endereço
 * também vai para o link de rastreio do cliente e para a tela do motoboy.
 */
describe('correção de endereço', () => {
  it('grava o endereço novo e limpa a coordenada antiga', async () => {
    const order = pedido();
    expect(order.coordinates).not.toBeNull();

    order.changeAddress(
      Address.create('Rua Adolfo Olinto, 250 - Centro, Pouso Alegre, MG'),
      clock.now(),
    );

    expect(order.address.raw).toContain('Adolfo Olinto');
    expect(order.coordinates).toBeNull();
  });

  it('preserva a referência do endereço antigo', async () => {
    // "Portão azul" continua valendo mesmo com a rua corrigida — é a instrução
    // que o motoboy usa para achar a casa.
    const order = pedido();
    const referencia = order.address.reference;

    order.changeAddress(Address.create('Rua Nova, 10', referencia), clock.now());

    expect(order.address.reference).toBe(referencia);
  });

  it('recusa corrigir pedido que já saiu para entrega', async () => {
    const order = pedido();
    const planRoute = new PlanRoute(
      uow,
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('r'),
      clock,
    );
    await planRoute.execute({ orderIds: [order.id], courierId: 'courier-1' });

    expect(() => order.changeAddress(Address.create('Rua Outra, 1'), clock.now())).toThrow(
      OrderNotPendingError,
    );
  });
});
