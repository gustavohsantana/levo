import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { StartRoute } from '@/application/use-cases/routes/start-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates, CourierUnavailableError, RouteAlreadyStartedError } from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * Adiantar a próxima leva enquanto o motoboy ainda está na rua.
 *
 * O pedido fica pronto às 20h10 e ele volta às 20h25. Bloquear até ele chegar
 * são quinze minutos de comida esfriando por burocracia — e o dono ainda teria
 * que lembrar de alocar depois, no meio do movimento.
 *
 * A trava não sumiu: mudou de lugar. Antes impedia o dono de adiantar; agora
 * impede o motoboy de sair duas vezes, que é onde ela pertence.
 */
const clock = new FixedClock(new Date('2026-09-02T20:00:00Z'));
const NORTE = Coordinates.create(-22.2100, -45.9346);
const SUL = Coordinates.create(-22.2600, -45.9346);

let db: InMemoryDatabase;
let plan: PlanRoute;
let start: StartRoute;
let contador = 0;

function pedido(coordinates: Coordinates): string {
  contador += 1;
  const o = makeOrder(`order-${contador}`, coordinates);
  db.orders.set(o.id, o);
  return o.id;
}

function motoboy(): string {
  return [...db.couriers.values()][0].id;
}

beforeEach(() => {
  db = newDatabase();
  contador = 0;
  const uow = new InMemoryUnitOfWork(db);
  plan = new PlanRoute(uow, new FakeRoutingService(), new TwoOptOptimizer(), new SequentialIds('r'), clock);
  start = new StartRoute(uow, clock);
});

describe('planejar', () => {
  it('permite montar a próxima leva com ele ainda na rua', async () => {
    const primeira = await plan.execute({ orderIds: [pedido(NORTE)], courierId: motoboy() });
    await start.execute(primeira.id);

    // Ele saiu. O pedido seguinte fica pronto e já pode ser separado para ele.
    const segunda = await plan.execute({ orderIds: [pedido(SUL)], courierId: motoboy() });

    expect(segunda.status).toBe('PLANNED');
    expect(segunda.id).not.toBe(primeira.id);
  });

  it('recusa empilhar duas levas na fila do mesmo motoboy', async () => {
    /*
     * Uma de cada vez. Duas não é adiantamento, é bagunça: ele não saberia qual
     * sai primeiro, e o dono perderia a conta do que já separou.
     */
    await plan.execute({ orderIds: [pedido(NORTE)], courierId: motoboy() });

    await expect(
      plan.execute({ orderIds: [pedido(SUL)], courierId: motoboy() }),
    ).rejects.toThrow(CourierUnavailableError);
  });
});

describe('sair para entrega', () => {
  it('recusa sair com a segunda enquanto a primeira corre', async () => {
    const primeira = await plan.execute({ orderIds: [pedido(NORTE)], courierId: motoboy() });
    await start.execute(primeira.id);
    const segunda = await plan.execute({ orderIds: [pedido(SUL)], courierId: motoboy() });

    // Ninguém está em dois lugares ao mesmo tempo.
    await expect(start.execute(segunda.id)).rejects.toThrow(CourierUnavailableError);
  });

  it('a segunda sai assim que a primeira termina', async () => {
    const primeira = await plan.execute({ orderIds: [pedido(NORTE)], courierId: motoboy() });
    await start.execute(primeira.id);
    const segunda = await plan.execute({ orderIds: [pedido(SUL)], courierId: motoboy() });

    const viva = db.routes.get(primeira.id)!;
    for (const stop of viva.stops) viva.completeStop(stop.id, 'DELIVERED', null, clock.now());
    db.routes.set(viva.id, viva);

    const saiu = await start.execute(segunda.id);
    expect(saiu.status).toBe('IN_PROGRESS');
  });

  it('iniciar a mesma rota duas vezes acusa a rota, não o motoboy', async () => {
    /*
     * Sem a condição de "só quando planejada", este caso acusaria "motoboy em
     * outra rota" — verdade por acidente, já que a outra é ela mesma, e o dono
     * sairia procurando um problema que não existe.
     */
    const rota = await plan.execute({ orderIds: [pedido(NORTE)], courierId: motoboy() });
    await start.execute(rota.id);

    await expect(start.execute(rota.id)).rejects.toThrow(RouteAlreadyStartedError);
  });
});
