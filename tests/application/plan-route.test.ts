import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import {
  Coordinates,
  CourierUnavailableError,
  NotFoundError,
  OrderNotGeocodedError,
  RouteTooLargeError,
} from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

let db: InMemoryDatabase;
let routing: FakeRoutingService;
let planRoute: PlanRoute;
const clock = new FixedClock(new Date('2026-08-22T22:00:00Z'));

/** Quatro bairros em pontos cardeais ao redor da pizzaria. */
const NORTE = Coordinates.create(-25.40, -49.27);
const SUL = Coordinates.create(-25.46, -49.27);
const LESTE = Coordinates.create(-25.43, -49.24);
const OESTE = Coordinates.create(-25.43, -49.31);

beforeEach(() => {
  db = newDatabase();
  routing = new FakeRoutingService();
  planRoute = new PlanRoute(
    new InMemoryUnitOfWork(db),
    routing,
    new TwoOptOptimizer(),
    new SequentialIds('route'),
    clock,
  );
});

function seedOrders(...coords: Coordinates[]): string[] {
  return coords.map((coordinates, index) => {
    const order = makeOrder(`order-${index + 1}`, coordinates);
    db.orders.set(order.id, order);
    return order.id;
  });
}

describe('PlanRoute', () => {
  it('cria a rota, ordena as paradas e marca os pedidos como em rota', async () => {
    const ids = seedOrders(NORTE, SUL, LESTE, OESTE);

    const route = await planRoute.execute({ courierId: 'courier-1', orderIds: ids });

    expect(route.stops).toHaveLength(4);
    expect(route.stops.map((stop) => stop.position)).toEqual([1, 2, 3, 4]);
    expect(new Set(route.stops.map((stop) => stop.orderId))).toEqual(new Set(ids));
    for (const id of ids) expect(db.orders.get(id)!.status).toBe('IN_ROUTE');
  });

  it('economiza tempo contra a ordem de chegada dos pedidos', async () => {
    // Ordem de chegada em ziguezague: norte, sul, leste, oeste. É o pior caso
    // real — os pedidos caem na ordem em que os clientes pedem, não por bairro.
    const ids = seedOrders(NORTE, SUL, LESTE, OESTE);

    const route = await planRoute.execute({ courierId: 'courier-1', orderIds: ids });

    expect(route.durationSeconds).toBeLessThan(route.baselineDurationSeconds);
    expect(route.savedSeconds).toBeGreaterThan(0);
    expect(route.savedMinutes).toBeGreaterThan(0);
  });

  it('nunca reporta economia negativa', async () => {
    // Pedidos já em ordem ótima: o otimizador não tem o que melhorar.
    const ids = seedOrders(NORTE, LESTE, SUL, OESTE);

    const route = await planRoute.execute({ courierId: 'courier-1', orderIds: ids });

    expect(route.savedSeconds).toBeGreaterThanOrEqual(0);
  });

  it('calcula ETA acumulado e crescente por parada', async () => {
    const ids = seedOrders(NORTE, SUL, LESTE);

    const route = await planRoute.execute({ courierId: 'courier-1', orderIds: ids });

    const etas = route.stops.map((stop) => stop.etaSeconds);
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
    expect(etas[0]).toBeGreaterThan(0);
  });

  it('registra o evento de planejamento com a economia embutida', async () => {
    const ids = seedOrders(NORTE, SUL, LESTE, OESTE);

    await planRoute.execute({ courierId: 'courier-1', orderIds: ids });

    const [planned] = db.eventsNamed('route.planned');
    expect(planned).toBeDefined();
    expect(planned.payload.savedSeconds).toBeGreaterThan(0);
    expect(planned.establishmentId).toBe('est-1');
  });

  it('recusa pedido sem coordenada', async () => {
    const ids = seedOrders(NORTE);
    const semPino = makeOrder('order-sem-pino', null);
    db.orders.set(semPino.id, semPino);

    await expect(
      planRoute.execute({ courierId: 'courier-1', orderIds: [...ids, semPino.id] }),
    ).rejects.toThrow(OrderNotGeocodedError);
  });

  it('recusa motoboy inativo', async () => {
    const ids = seedOrders(NORTE);

    await expect(
      planRoute.execute({ courierId: 'courier-2', orderIds: ids }),
    ).rejects.toThrow(CourierUnavailableError);
  });

  it('recusa motoboy que já está em outra rota', async () => {
    await planRoute.execute({ courierId: 'courier-1', orderIds: seedOrders(NORTE) });

    const outros = seedOrders(SUL);
    await expect(
      planRoute.execute({ courierId: 'courier-1', orderIds: outros }),
    ).rejects.toThrow(CourierUnavailableError);
  });

  it('recusa pedido inexistente', async () => {
    await expect(
      planRoute.execute({ courierId: 'courier-1', orderIds: ['nao-existe'] }),
    ).rejects.toThrow(NotFoundError);
  });

  it('recusa rota maior que o baú da moto', async () => {
    const small = new PlanRoute(
      new InMemoryUnitOfWork(db),
      routing,
      new TwoOptOptimizer(),
      new SequentialIds('route'),
      clock,
      2,
    );
    const ids = seedOrders(NORTE, SUL, LESTE);

    await expect(small.execute({ courierId: 'courier-1', orderIds: ids })).rejects.toThrow(
      RouteTooLargeError,
    );
  });

  it('não deixa pedido marcado quando a rota falha', async () => {
    const ids = seedOrders(NORTE);
    const semPino = makeOrder('order-sem-pino', null);
    db.orders.set(semPino.id, semPino);

    await expect(
      planRoute.execute({ courierId: 'courier-1', orderIds: [...ids, semPino.id] }),
    ).rejects.toThrow();

    // O pedido válido continua disponível para a próxima tentativa.
    expect(db.orders.get(ids[0])!.status).toBe('NEW');
    expect(db.routes.size).toBe(0);
  });
});
