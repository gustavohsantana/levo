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
 * Fechar entregas pelo painel, sem depender do motoboy.
 *
 * Ele esquece, o celular descarrega, ou simplesmente nao usa a tela — e sem
 * isto o dono termina o dia com rota aberta e precisa ligar para cada um.
 */
let db: InMemoryDatabase;
let uow: InMemoryUnitOfWork;
let completeStop: CompleteStop;
let rotaId: string;
const clock = new FixedClock(new Date('2026-09-01T18:00:00Z'));

async function rotaComTresParadas() {
  const pontos = [
    Coordinates.create(-22.2307, -45.9346),
    Coordinates.create(-25.44, -49.28),
    Coordinates.create(-25.45, -49.29),
  ];
  const ids: string[] = [];
  for (const [i, p] of pontos.entries()) {
    const o = makeOrder(`o${i}`, p, { source: 'IFOOD', externalId: `ext-${i}` });
    await uow.run((repos) => repos.orders.save(o));
    ids.push(o.id);
  }
  const plan = new PlanRoute(uow, new FakeRoutingService(), new TwoOptOptimizer(), new SequentialIds('r'), clock);
  const rota = await plan.execute({ courierId: 'courier-1', orderIds: ids });
  await new StartRoute(uow, clock).execute(rota.id);
  return rota.id;
}

beforeEach(async () => {
  db = newDatabase();
  uow = new InMemoryUnitOfWork(db);
  completeStop = new CompleteStop(uow, clock);
  rotaId = await rotaComTresParadas();
});

describe('concluir várias entregas de uma vez', () => {
  it('marca só as escolhidas e deixa o resto pendente', async () => {
    const rota = await uow.run((repos) => repos.routes.findById(rotaId));
    const escolhidas = rota!.stops.slice(0, 2).map((s) => s.id);

    await completeStop.executeMany(rotaId, escolhidas);

    const depois = await uow.run((repos) => repos.routes.findById(rotaId));
    expect(depois!.stops.filter((s) => s.status === 'DELIVERED')).toHaveLength(2);
    expect(depois!.stops.filter((s) => s.status === 'PENDING')).toHaveLength(1);
  });

  it('o que ficou de fora continua PENDENTE, não vira falha', async () => {
    const rota = await uow.run((repos) => repos.routes.findById(rotaId));

    await completeStop.executeMany(rotaId, [rota!.stops[0].id]);

    const depois = await uow.run((repos) => repos.routes.findById(rotaId));
    expect(depois!.stops.filter((s) => s.status === 'FAILED')).toHaveLength(0);
  });

  it('fecha a rota quando a última parada é concluída', async () => {
    const rota = await uow.run((repos) => repos.routes.findById(rotaId));

    await completeStop.executeMany(rotaId, rota!.stops.map((s) => s.id));

    const depois = await uow.run((repos) => repos.routes.findById(rotaId));
    expect(depois!.status).toBe('FINISHED');
  });

  it('avisa o marketplace de cada entrega', async () => {
    const rota = await uow.run((repos) => repos.routes.findById(rotaId));

    await completeStop.executeMany(rotaId, rota!.stops.map((s) => s.id));

    const avisos = [...db.marketplace.values()].filter((c) => c.command === 'DELIVERED');
    expect(avisos).toHaveLength(3);
  });

  /*
   * Tudo-ou-nada: o dono marcou cinco entregas e nao pode acabar com tres
   * marcadas e duas nao. Uma parada inexistente derruba a leva inteira.
   */
  it('não grava nada quando uma das paradas não existe', async () => {
    const rota = await uow.run((repos) => repos.routes.findById(rotaId));

    await expect(
      completeStop.executeMany(rotaId, [rota!.stops[0].id, 'parada-que-nao-existe']),
    ).rejects.toThrow();

    const depois = await uow.run((repos) => repos.routes.findById(rotaId));
    expect(depois!.stops.filter((s) => s.status === 'PENDING')).toHaveLength(3);
  });

  it('lista vazia não faz nada', async () => {
    await completeStop.executeMany(rotaId, []);

    const depois = await uow.run((repos) => repos.routes.findById(rotaId));
    expect(depois!.status).toBe('IN_PROGRESS');
  });
});
