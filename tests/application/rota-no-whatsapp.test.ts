import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates } from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * A rota que chega no WhatsApp do motoboy.
 *
 * O que erra calado aqui é enfileirar quando não devia: mensagem automática sai
 * de um número que pode ser banido, e o dono precisa ter ligado isso de
 * propósito. O contrário — não enfileirar quando devia — o motoboy reclama no
 * mesmo dia.
 */
const clock = new FixedClock(new Date('2026-09-01T22:00:00Z'));
const NORTE = Coordinates.create(-25.4, -49.27);
const SUL = Coordinates.create(-25.46, -49.27);

let db: InMemoryDatabase;

function planejador(baseUrl = 'https://levoentregas.vercel.app') {
  return new PlanRoute(
    new InMemoryUnitOfWork(db),
    new FakeRoutingService(),
    new TwoOptOptimizer(),
    new SequentialIds('route'),
    clock,
    undefined,
    baseUrl,
  );
}

function pedidos(...coords: Coordinates[]): string[] {
  return coords.map((coordinates, i) => {
    const order = makeOrder(`order-${i + 1}`, coordinates);
    db.orders.set(order.id, order);
    return order.id;
  });
}

function courierId(): string {
  return [...db.couriers.values()][0].id;
}

beforeEach(() => {
  db = newDatabase();
});

describe('enfileirar a rota', () => {
  it('não manda nada com o recurso desligado', async () => {
    db.whatsappRoutes = false;

    await planejador().execute({ orderIds: pedidos(NORTE, SUL), courierId: courierId() });

    expect(db.notificacoes.size).toBe(0);
  });

  it('enfileira com o recurso ligado, com link e contagem', async () => {
    db.whatsappRoutes = true;

    const rota = await planejador().execute({
      orderIds: pedidos(NORTE, SUL),
      courierId: courierId(),
    });

    expect(db.notificacoes.size).toBe(1);
    const aviso = db.notificacoes.get(rota.id)!;

    expect(aviso.text).toContain('2 entregas');
    expect(aviso.text).toContain(`/m/${rota.accessToken}`);
    // Só dígitos com DDI: é o que a WAHA espera antes do @c.us.
    expect(aviso.phone).toMatch(/^55\d{10,11}$/);
  });

  it('sem endereço público não enfileira link quebrado', async () => {
    /*
     * Uma mensagem com "undefined/m/token" é pior que mensagem nenhuma: o
     * motoboy toca, não abre, e liga para a loja.
     */
    db.whatsappRoutes = true;

    await planejador('').execute({ orderIds: pedidos(NORTE), courierId: courierId() });

    expect(db.notificacoes.size).toBe(0);
  });

  it('a mensagem vive na mesma transação da rota', async () => {
    db.whatsappRoutes = true;

    const rota = await planejador().execute({ orderIds: pedidos(NORTE), courierId: courierId() });

    // Uma rota, uma mensagem, com a chave sendo a rota: replanejar não duplica.
    expect([...db.notificacoes.keys()]).toEqual([rota.id]);
  });
});
