import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { StartRoute } from '@/application/use-cases/routes/start-route';
import { CompleteStop } from '@/application/use-cases/routes/complete-stop';
import { RecordCourierPing } from '@/application/use-cases/routes/record-courier-ping';
import { GetTrackingSnapshot } from '@/application/use-cases/tracking/get-tracking-snapshot';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates, RouteAlreadyStartedError, StopAlreadyResolvedError } from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

let db: InMemoryDatabase;
let clock: FixedClock;
let uow: InMemoryUnitOfWork;
let planRoute: PlanRoute;
let startRoute: StartRoute;
let completeStop: CompleteStop;
let recordPing: RecordCourierPing;
let tracking: GetTrackingSnapshot;

beforeEach(() => {
  db = newDatabase();
  clock = new FixedClock(new Date('2026-08-22T22:00:00Z'));
  uow = new InMemoryUnitOfWork(db);
  planRoute = new PlanRoute(uow, new FakeRoutingService(), new TwoOptOptimizer(), new SequentialIds('r'), clock);
  startRoute = new StartRoute(uow, clock);
  completeStop = new CompleteStop(uow, clock);
  recordPing = new RecordCourierPing(uow, clock);
  tracking = new GetTrackingSnapshot(uow, clock);
});

async function routeWithThreeStops() {
  const coords = [
    Coordinates.create(-25.40, -49.27),
    Coordinates.create(-25.46, -49.27),
    Coordinates.create(-25.43, -49.24),
  ];
  const ids = coords.map((coordinates, index) => {
    const order = makeOrder(`order-${index + 1}`, coordinates);
    db.orders.set(order.id, order);
    return order.id;
  });
  return planRoute.execute({ courierId: 'courier-1', orderIds: ids });
}

describe('fluxo de entrega', () => {
  it('conclui a rota quando a última parada é resolvida', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);

    for (const stop of route.stops) {
      clock.advance(600);
      await completeStop.execute(route.id, { stopId: stop.id, outcome: 'DELIVERED' });
    }

    const finished = db.routes.get(route.id)!;
    expect(finished.status).toBe('FINISHED');
    expect(finished.finishedAt).not.toBeNull();
    expect(db.eventsNamed('route.finished')).toHaveLength(1);
    for (const stop of finished.stops) expect(db.orders.get(stop.orderId)!.status).toBe('DELIVERED');
  });

  it('aceita entrega fora da ordem planejada', async () => {
    // Rua interditada, cliente não atende e ele volta depois: software que
    // trava porque a realidade não seguiu o plano é software abandonado.
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);

    const [primeira, , terceira] = route.stops;
    await completeStop.execute(route.id, { stopId: terceira.id, outcome: 'DELIVERED' });
    await completeStop.execute(route.id, { stopId: primeira.id, outcome: 'DELIVERED' });

    expect(db.routes.get(route.id)!.pendingStops).toHaveLength(1);
    expect(db.routes.get(route.id)!.status).toBe('IN_PROGRESS');
  });

  it('registra entrega falha com motivo e não conta como entregue', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);

    await completeStop.execute(route.id, {
      stopId: route.stops[0].id,
      outcome: 'FAILED',
      reason: 'cliente ausente',
    });

    expect(db.orders.get(route.stops[0].orderId)!.status).toBe('FAILED');
    expect(db.eventsNamed('order.failed')[0].payload.reason).toBe('cliente ausente');
  });

  it('preserva o horário do toque quando a marcação veio da fila offline', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);

    // Entregou 22:10, mas o celular só sincronizou 22:40.
    const realTouch = new Date('2026-08-22T22:10:00Z');
    clock.set(new Date('2026-08-22T22:40:00Z'));

    await completeStop.execute(route.id, {
      stopId: route.stops[0].id,
      outcome: 'DELIVERED',
      occurredAt: realTouch,
    });

    expect(db.orders.get(route.stops[0].orderId)!.deliveredAt).toEqual(realTouch);
  });

  it('recusa concluir a mesma parada duas vezes', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);
    const stop = route.stops[0];

    await completeStop.execute(route.id, { stopId: stop.id, outcome: 'DELIVERED' });

    await expect(
      completeStop.execute(route.id, { stopId: stop.id, outcome: 'DELIVERED' }),
    ).rejects.toThrow(StopAlreadyResolvedError);
  });

  it('recusa iniciar a rota duas vezes', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);

    await expect(startRoute.execute(route.id)).rejects.toThrow(RouteAlreadyStartedError);
  });

  it('ignora ping de rota já encerrada', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);
    for (const stop of route.stops) {
      await completeStop.execute(route.id, { stopId: stop.id, outcome: 'DELIVERED' });
    }

    await recordPing.execute(route.id, { lat: -25.43, lng: -49.27 });

    expect(db.pings.get(route.id) ?? []).toHaveLength(0);
  });
});

describe('rastreio público', () => {
  it('mostra o motoboy a caminho e quantas paradas faltam antes', async () => {
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);
    await recordPing.execute(route.id, { lat: -25.42, lng: -49.26 });

    const ultima = route.stops[2];
    const order = db.orders.get(ultima.orderId)!;

    const snapshot = await tracking.execute(order.trackingToken.value);

    expect(snapshot.status).toBe('ON_THE_WAY');
    expect(snapshot.stopsAhead).toBe(2);
    expect(snapshot.courierPosition).toMatchObject({ lat: -25.42, lng: -49.26 });
    expect(snapshot.establishmentName).toBe('Pizzaria do Zé');
  });

  it('⭐ não vaza dado de ninguém — nem do cliente, nem do motoboy, nem das outras entregas', async () => {
    // Este link circula por WhatsApp e vai parar em grupo de família.
    const route = await routeWithThreeStops();
    await startRoute.execute(route.id);
    const order = db.orders.get(route.stops[0].orderId)!;

    const snapshot = await tracking.execute(order.trackingToken.value);
    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain(order.customerPhone!.value); // telefone do cliente
    expect(serialized).not.toContain('Jefferson');                // nome do motoboy
    expect(serialized).not.toContain('41999990001');              // telefone do motoboy
    expect(serialized).not.toContain(order.address.raw);          // endereço por extenso
    for (const outra of route.stops.slice(1)) {
      const outroPedido = db.orders.get(outra.orderId)!;
      expect(serialized).not.toContain(outroPedido.customerName); // outros clientes
    }
  });

  it('diz "preparando" antes de a rota sair', async () => {
    const route = await routeWithThreeStops();
    const order = db.orders.get(route.stops[0].orderId)!;

    const snapshot = await tracking.execute(order.trackingToken.value);

    expect(snapshot.status).toBe('PREPARING');
    expect(snapshot.courierPosition).toBeNull();
  });

  it('registra a abertura do link — métrica de adoção do piloto', async () => {
    const route = await routeWithThreeStops();
    const order = db.orders.get(route.stops[0].orderId)!;

    await tracking.execute(order.trackingToken.value, true);

    expect(db.eventsNamed('order.tracking_opened')).toHaveLength(1);
  });

  it('⭐ a sondagem de 10s não conta como abertura', async () => {
    // A página se atualiza sozinha a cada 10 segundos. Se cada atualização
    // contasse, um cliente acompanhando por 20 minutos valeria 120 "aberturas"
    // e a métrica passaria a medir tempo de tela, não interesse — levando à
    // conclusão errada sobre manter ou cortar o rastreio.
    const route = await routeWithThreeStops();
    const order = db.orders.get(route.stops[0].orderId)!;

    await tracking.execute(order.trackingToken.value, true); // carga da página
    for (let poll = 0; poll < 120; poll++) {
      await tracking.execute(order.trackingToken.value); // sondagens
    }

    expect(db.eventsNamed('order.tracking_opened')).toHaveLength(1);
  });
});
