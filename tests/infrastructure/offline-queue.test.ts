import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueuedStop } from '@/presentation/ui/offline-queue';

/**
 * A fila offline é o que sustenta o produto em campo. O bug que estes testes
 * travam: a versão anterior tratava TODO 4xx como definitivo e descartava a
 * marcação. Quando a rota ainda não tinha sido liberada pelo dono, o servidor
 * respondia 409 e a entrega sumia — o motoboy via "entregue" na tela e nada
 * havia sido gravado.
 *
 * Sem `indexedDB` no Node, o módulo cai para o modo memória sozinho, que é
 * justamente o caminho de degradação que também queremos exercitar.
 */

function stop(id: string): QueuedStop {
  return {
    token: 'token-de-rota-com-tamanho',
    stopId: id,
    outcome: 'DELIVERED',
    reason: null,
    occurredAt: '2026-08-22T22:10:00.000Z',
  };
}

// Assinatura declarada para o TypeScript conseguir inspecionar `mock.calls`.
function respondWith(status: number, body: Record<string, unknown> = {}) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
}

// Cada teste precisa de um módulo novo, porque a fila em memória é de módulo.
async function freshQueue() {
  vi.resetModules();
  return import('@/presentation/ui/offline-queue');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fila offline', () => {
  it('envia e limpa quando o servidor aceita', async () => {
    const { enqueue, flush, peek } = await freshQueue();
    vi.stubGlobal('fetch', respondWith(200, { ok: true }));

    await enqueue(stop('parada-1'));
    await enqueue(stop('parada-2'));

    const result = await flush();

    expect(result).toMatchObject({ sent: 2, pending: 0, blocked: null });
    expect(await peek()).toHaveLength(0);
  });

  it('⭐ guarda a entrega quando a rota ainda não foi liberada', async () => {
    // Este é o caso que sumia. 409 ROUTE_NOT_ACTIVE é TEMPORÁRIO: o dono ainda
    // vai clicar em "saiu para entrega".
    const { enqueue, flush, peek } = await freshQueue();
    vi.stubGlobal(
      'fetch',
      respondWith(409, { code: 'ROUTE_NOT_ACTIVE', error: 'Rota não está em andamento (PLANNED)' }),
    );

    await enqueue(stop('parada-1'));
    const result = await flush();

    expect(result.sent).toBe(0);
    expect(result.pending).toBe(1);
    expect(result.blocked).toContain('Rota não está em andamento');
    expect(await peek()).toHaveLength(1);
  });

  it('a entrega guardada sai assim que a rota é liberada', async () => {
    const { enqueue, flush, peek } = await freshQueue();

    vi.stubGlobal('fetch', respondWith(409, { code: 'ROUTE_NOT_ACTIVE' }));
    await enqueue(stop('parada-1'));
    await flush();

    vi.stubGlobal('fetch', respondWith(200, { ok: true }));
    const result = await flush();

    expect(result.sent).toBe(1);
    expect(await peek()).toHaveLength(0);
  });

  it('descarta o que já foi resolvido no servidor', async () => {
    // 409 STOP_ALREADY_RESOLVED é definitivo: reenviar para sempre só encheria
    // a fila.
    const { enqueue, flush, peek } = await freshQueue();
    vi.stubGlobal('fetch', respondWith(409, { code: 'STOP_ALREADY_RESOLVED' }));

    await enqueue(stop('parada-1'));
    const result = await flush();

    expect(result.sent).toBe(1);
    expect(await peek()).toHaveLength(0);
  });

  it('mantém na fila quando a rede cai', async () => {
    const { enqueue, flush, peek } = await freshQueue();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) => {
        throw new Error('offline');
      }),
    );

    await enqueue(stop('parada-1'));
    const result = await flush();

    expect(result.pending).toBe(1);
    expect(result.blocked).toBe('Sem conexão');
    expect(await peek()).toHaveLength(1);
  });

  it('mantém na fila quando o servidor falha', async () => {
    const { enqueue, flush, peek } = await freshQueue();
    vi.stubGlobal('fetch', respondWith(500, { error: 'Erro interno' }));

    await enqueue(stop('parada-1'));

    expect((await flush()).pending).toBe(1);
    expect(await peek()).toHaveLength(1);
  });

  it('preserva o horário do toque, não o da sincronização', async () => {
    const { enqueue, flush } = await freshQueue();
    const fetchMock = respondWith(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await enqueue(stop('parada-1'));
    await flush();

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.occurredAt).toBe('2026-08-22T22:10:00.000Z');
  });

  it('não perde entrega quando uma falha e outra passa', async () => {
    const { enqueue, flush, peek } = await freshQueue();
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) => {
        call++;
        return call === 1
          ? new Response(JSON.stringify({ ok: true }), { status: 200 })
          : new Response(JSON.stringify({ code: 'ROUTE_NOT_ACTIVE' }), { status: 409 });
      }),
    );

    await enqueue(stop('parada-1'));
    await enqueue(stop('parada-2'));
    const result = await flush();

    expect(result.sent).toBe(1);
    expect(result.pending).toBe(1);
    expect((await peek())[0].stopId).toBe('parada-2');
  });
});
