import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelOrder, CancellationRefusedError } from '@/application/use-cases/orders/cancel-order';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
} from '@/infrastructure/fakes/in-memory';
import type { MarketplaceCommands } from '@/core';
import { Coordinates } from '@/core';
import { makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * Cancelar é a única ação do painel sem volta.
 *
 * Por isso o estado local só muda DEPOIS que a plataforma aceita: marcar antes
 * deixaria o painel dizendo "cancelado" para um pedido que o iFood recusou, e a
 * comida sairia assim mesmo.
 */
let db: InMemoryDatabase;
let uow: InMemoryUnitOfWork;
const clock = new FixedClock(new Date('2026-08-31T15:00:00Z'));
const ponto = Coordinates.create(-25.43, -49.27);

function comandos(over: Partial<MarketplaceCommands> = {}): MarketplaceCommands {
  return { kind: 'IFOOD', ...over } as MarketplaceCommands;
}

beforeEach(() => {
  db = newDatabase();
  uow = new InMemoryUnitOfWork(db);
});

async function gravarPedido(id = 'o1') {
  const order = makeOrder(id, ponto, { source: 'IFOOD', externalId: `ext-${id}` });
  await uow.run((repos) => repos.orders.save(order));
  return order;
}

describe('CancelOrder', () => {
  it('pede o cancelamento com o motivo escolhido e só então cancela aqui', async () => {
    await gravarPedido();
    const requestCancellation = vi.fn().mockResolvedValue(undefined);
    const uc = new CancelOrder(uow, async () => comandos({ requestCancellation }), clock);

    await uc.execute('o1', 'ITEM INDISPONIVEL', '503');

    expect(requestCancellation).toHaveBeenCalledWith('ext-o1', 'ITEM INDISPONIVEL', '503');
    const depois = await uow.run((repos) => repos.orders.findById('o1'));
    expect(depois?.status).toBe('CANCELLED');
  });

  it('não cancela aqui quando a plataforma recusa', async () => {
    await gravarPedido();
    const uc = new CancelOrder(
      uow,
      async () => comandos({ requestCancellation: vi.fn().mockRejectedValue(new Error('HTTP 422')) }),
      clock,
    );

    await expect(uc.execute('o1', 'x', '501')).rejects.toBeInstanceOf(CancellationRefusedError);

    const depois = await uow.run((repos) => repos.orders.findById('o1'));
    expect(depois?.status).toBe('NEW');
  });

  it('recusa pedido sem origem externa — não há plataforma para avisar', async () => {
    const manual = makeOrder('m1', ponto);
    await uow.run((repos) => repos.orders.save(manual));
    const uc = new CancelOrder(uow, async () => comandos(), clock);

    await expect(uc.execute('m1', 'x', '501')).rejects.toBeInstanceOf(CancellationRefusedError);
  });

  it('recusa quando a plataforma não implementa cancelamento', async () => {
    await gravarPedido();
    // aiqfome hoje: sem endpoint de cancelamento.
    const uc = new CancelOrder(uow, async () => comandos(), clock);

    await expect(uc.execute('o1', 'x', '501')).rejects.toBeInstanceOf(CancellationRefusedError);
  });

  it('devolve os motivos que a plataforma aceita para aquele pedido', async () => {
    await gravarPedido();
    const uc = new CancelOrder(
      uow,
      async () =>
        comandos({
          cancellationReasons: vi
            .fn()
            .mockResolvedValue([{ cancelCodeId: '503', description: 'ITEM INDISPONIVEL' }]),
        }),
      clock,
    );

    expect(await uc.reasons('o1')).toEqual([
      { cancelCodeId: '503', description: 'ITEM INDISPONIVEL' },
    ]);
  });

  it('lista vazia quando a plataforma não oferece motivos — 204 do sandbox', async () => {
    await gravarPedido();
    const uc = new CancelOrder(uow, async () => comandos(), clock);

    expect(await uc.reasons('o1')).toEqual([]);
  });
});
