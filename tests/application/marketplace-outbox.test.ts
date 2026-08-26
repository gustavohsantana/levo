import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { StartRoute } from '@/application/use-cases/routes/start-route';
import { CompleteStop } from '@/application/use-cases/routes/complete-stop';
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
 * O pedido não vive só dentro do Levô.
 *
 * Sem avisar a plataforma, o lojista dá baixa duas vezes — uma aqui, outra no
 * aplicativo do marketplace — e é o tipo de trabalho dobrado que faz um sistema
 * ser abandonado depois de duas semanas.
 *
 * O aviso vai para uma caixa de saída na mesma transação que grava a entrega:
 * chamar a API de terceiro ali dentro prenderia a transação em rede alheia e
 * perderia o aviso em qualquer falha.
 */
let db: InMemoryDatabase;
let uow: InMemoryUnitOfWork;
let planRoute: PlanRoute;
let startRoute: StartRoute;
let completeStop: CompleteStop;

beforeEach(() => {
  db = newDatabase();
  const clock = new FixedClock(new Date('2026-08-26T12:00:00Z'));
  uow = new InMemoryUnitOfWork(db);
  planRoute = new PlanRoute(
    uow,
    new FakeRoutingService(),
    new TwoOptOptimizer(),
    new SequentialIds('r'),
    clock,
  );
  startRoute = new StartRoute(uow, clock);
  completeStop = new CompleteStop(uow, clock);
});

async function rotaCom(
  overrides: Parameters<typeof makeOrder>[2] = {},
): Promise<{ routeId: string; stopId: string }> {
  const order = makeOrder('order-1', Coordinates.create(-22.23, -45.93), overrides);
  db.orders.set(order.id, order);

  const route = await planRoute.execute({ orderIds: [order.id], courierId: 'courier-1' });
  return { routeId: route.id, stopId: route.stops[0].id };
}

const avisos = () => [...db.marketplace.values()];

describe('avisos ao marketplace', () => {
  it('enfileira DELIVERED quando a parada é concluída', async () => {
    const { routeId, stopId } = await rotaCom({ source: 'AIQFOME', externalId: '140036851' });
    await startRoute.execute(routeId);

    await completeStop.execute(routeId, { stopId, outcome: 'DELIVERED' });

    expect(avisos()).toContainEqual({
      establishmentId: 'est-1',
      provider: 'AIQFOME',
      externalOrderId: '140036851',
      command: 'DELIVERED',
    });
  });

  it('enfileira DISPATCH quando a rota começa', async () => {
    const { routeId } = await rotaCom({ source: 'IFOOD', externalId: 'eba8a2a9' });

    await startRoute.execute(routeId);

    expect(avisos()).toContainEqual({
      establishmentId: 'est-1',
      provider: 'IFOOD',
      externalOrderId: 'eba8a2a9',
      command: 'DISPATCH',
    });
  });

  it('não avisa ninguém sobre pedido digitado à mão', async () => {
    // Pedido manual não tem contraparte lá fora: enfileirar geraria uma
    // chamada para um `externalId` que não existe em plataforma nenhuma.
    const { routeId, stopId } = await rotaCom();
    await startRoute.execute(routeId);

    await completeStop.execute(routeId, { stopId, outcome: 'DELIVERED' });

    expect(avisos()).toEqual([]);
  });

  it('não avisa entrega que falhou', async () => {
    // Quem decide o que fazer com uma entrega frustrada é o dono — remarcar,
    // devolver, cancelar. Dizer "entregue" ao marketplace seria mentir.
    const { routeId, stopId } = await rotaCom({ source: 'AIQFOME', externalId: '140036851' });
    await startRoute.execute(routeId);

    await completeStop.execute(routeId, {
      stopId,
      outcome: 'FAILED',
      reason: 'cliente ausente',
    });

    expect(avisos().some((a) => a.command === 'DELIVERED')).toBe(false);
  });

  it('não duplica o aviso quando a conclusão é reenviada', async () => {
    // A fila offline do celular reenvia marcações; o índice único no banco
    // recusa a segunda, e o fake espelha isso.
    const { routeId, stopId } = await rotaCom({ source: 'AIQFOME', externalId: '140036851' });
    await startRoute.execute(routeId);

    await completeStop.execute(routeId, { stopId, outcome: 'DELIVERED' });
    await completeStop
      .execute(routeId, { stopId, outcome: 'DELIVERED' })
      .catch(() => undefined);

    expect(avisos().filter((a) => a.command === 'DELIVERED')).toHaveLength(1);
  });

  it('não enfileira nada para pedido de marketplace sem externalId', async () => {
    const { routeId, stopId } = await rotaCom({ source: 'IFOOD', externalId: null });
    await startRoute.execute(routeId);

    await completeStop.execute(routeId, { stopId, outcome: 'DELIVERED' });

    expect(avisos()).toEqual([]);
  });
});
