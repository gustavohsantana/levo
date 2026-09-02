import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { ReplanFromHere } from '@/application/use-cases/routes/replan-from-here';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates, ValidationError } from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * Replanejar a partir de onde o motoboy está.
 *
 * A rota nasce da loja, e é o certo — é de lá que ele sai. Mas o dia acontece:
 * ele passa em casa buscar o capacete, desvia por bloqueio, entrega fora de
 * ordem. A partir daí a sequência montada na porta do restaurante custa
 * quilômetro, e insistir nela é o sistema brigando com a realidade.
 */
const clock = new FixedClock(new Date('2026-09-02T18:00:00Z'));

/** Quatro pontos ao redor de Pouso Alegre, em direções bem separadas. */
const NORTE = Coordinates.create(-22.2100, -45.9346);
const SUL = Coordinates.create(-22.2600, -45.9346);
const LESTE = Coordinates.create(-22.2307, -45.9000);
const OESTE = Coordinates.create(-22.2307, -45.9700);

let db: InMemoryDatabase;
let routing: FakeRoutingService;

function planejar() {
  return new PlanRoute(
    new InMemoryUnitOfWork(db),
    routing,
    new TwoOptOptimizer(),
    new SequentialIds('route'),
    clock,
  );
}

function replanejar() {
  return new ReplanFromHere(
    new InMemoryUnitOfWork(db),
    routing,
    new TwoOptOptimizer(),
    clock,
  );
}

async function rotaEmAndamento(...pontos: Coordinates[]) {
  const ids = pontos.map((coordinates, i) => {
    const o = makeOrder(`order-${i + 1}`, coordinates);
    db.orders.set(o.id, o);
    return o.id;
  });

  const rota = await planejar().execute({
    orderIds: ids,
    courierId: [...db.couriers.values()][0].id,
  });

  const viva = db.routes.get(rota.id)!;
  viva.start(clock.now());
  return viva;
}

beforeEach(() => {
  db = newDatabase();
  routing = new FakeRoutingService();
});

describe('replanejar', () => {
  it('reordena as pendentes a partir da posição informada', async () => {
    const rota = await rotaEmAndamento(NORTE, SUL, LESTE, OESTE);
    const antes = rota.stops.map((s) => s.orderId);

    // Ele foi parar bem no sul: dali, a ordem que saía da loja não serve mais.
    const r = await replanejar().execute(rota.id, Coordinates.create(-22.2700, -45.9346));

    expect(r.reordenadas).toBe(4);
    const depois = db.routes.get(rota.id)!.stops.map((s) => s.orderId);
    // As mesmas paradas, em outra ordem — nada some no replanejamento.
    expect([...depois].sort()).toEqual([...antes].sort());
  });

  it('não mexe no que já foi entregue', async () => {
    const rota = await rotaEmAndamento(NORTE, SUL, LESTE, OESTE);
    const primeira = rota.stops[0];
    rota.completeStop(primeira.id, 'DELIVERED', null, clock.now());
    db.routes.set(rota.id, rota);

    const r = await replanejar().execute(rota.id, SUL);

    // Só as três pendentes entram: entrega resolvida é história.
    expect(r.reordenadas).toBe(3);
    const entregue = db.routes.get(rota.id)!.stops.find((s) => s.id === primeira.id)!;
    expect(entregue.status).toBe('DELIVERED');
    expect(entregue.position).toBe(primeira.position);
  });

  it('a numeração continua de onde parou, não recomeça do 1', async () => {
    /*
     * Recomeçar do 1 no meio do turno faria o motoboy achar que perdeu as
     * entregas que já fez — e ligar para a loja perguntando.
     */
    const rota = await rotaEmAndamento(NORTE, SUL, LESTE, OESTE);
    rota.completeStop(rota.stops[0].id, 'DELIVERED', null, clock.now());
    db.routes.set(rota.id, rota);

    await replanejar().execute(rota.id, SUL);

    const pendentes = db.routes
      .get(rota.id)!
      .stops.filter((s) => s.status === 'PENDING')
      .map((s) => s.position)
      .sort((a, b) => a - b);

    expect(pendentes).toEqual([2, 3, 4]);
  });

  it('recusa quando sobra uma entrega só', async () => {
    // Dizer isso é melhor que devolver "pronto!" para um botão que não fez nada.
    const rota = await rotaEmAndamento(NORTE, SUL);
    rota.completeStop(rota.stops[0].id, 'DELIVERED', null, clock.now());
    db.routes.set(rota.id, rota);

    await expect(replanejar().execute(rota.id, SUL)).rejects.toThrow(ValidationError);
  });

  it('recusa rota que ainda não saiu', async () => {
    const ids = [NORTE, SUL].map((c, i) => {
      const o = makeOrder(`order-${i + 1}`, c);
      db.orders.set(o.id, o);
      return o.id;
    });
    const rota = await planejar().execute({
      orderIds: ids,
      courierId: [...db.couriers.values()][0].id,
    });

    // Rota planejada e não iniciada se replaneja apagando e refazendo, no painel.
    await expect(replanejar().execute(rota.id, SUL)).rejects.toThrow();
  });
});
