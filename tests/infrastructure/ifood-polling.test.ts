import { afterEach, describe, expect, it, vi } from 'vitest';
import { IfoodOrderSource } from '@/infrastructure/integrations/ifood/adapter';

/**
 * O filtro de eventos do polling.
 *
 * Estes testes existem por causa de um defeito real: o adapter filtrava por
 * `PLACED`, mas o iFood envia `PLC`. Nenhum evento casava, o worker ficava em
 * silêncio — sem erro, sem pedido — e parecia que a loja não tinha movimento.
 * Um teste com o payload de verdade teria pego isso antes do ambiente real.
 */
// No iFood o `id` do pedido é o mesmo `orderId` que veio no evento.
const PEDIDO = {
  id: 'pedido-1',
  customer: { name: 'Maria Silva', phone: { number: '41999998888' } },
  delivery: {
    deliveryAddress: { formattedAddress: 'Rua XV de Novembro, 100 - Centro, Curitiba' },
  },
  total: { orderAmount: 50 },
};

function adapterCom(eventos: unknown[]) {
  const chamadas: Array<{ url: string; body?: unknown }> = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      chamadas.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });

      if (url.includes('events:polling')) {
        return { ok: true, status: 200, text: async () => JSON.stringify(eventos) };
      }
      if (url.includes('acknowledgment')) {
        // Como o iFood responde de verdade: 202 e corpo vazio.
        return { ok: true, status: 202, text: async () => '' };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify(PEDIDO) };
    }),
  );

  const adapter = new IfoodOrderSource({
    merchantId: 'loja-1',
    accessToken: async () => 'token',
  });

  return { adapter, chamadas };
}

afterEach(() => vi.unstubAllGlobals());

describe('IfoodOrderSource — polling', () => {
  it('reconhece o código abreviado PLC como pedido novo', async () => {
    const { adapter } = adapterCom([
      { id: 'ev-1', code: 'PLC', orderId: 'pedido-1', createdAt: '2026-08-24T17:00:00Z' },
    ]);

    const pedidos = await adapter.fetchPending();

    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].externalId).toBe('pedido-1');
  });

  it('reconhece CFM, para quando a integração é ligada com pedidos já confirmados', async () => {
    const { adapter } = adapterCom([
      { id: 'ev-1', code: 'CFM', orderId: 'pedido-1', createdAt: '2026-08-24T17:00:00Z' },
    ]);

    expect(await adapter.fetchPending()).toHaveLength(1);
  });

  it('ignora pedido cancelado no mesmo lote', async () => {
    // Foi o que aconteceu no teste real: PLC e, dois minutos depois, CAR + CAN.
    const { adapter } = adapterCom([
      { id: 'ev-1', code: 'PLC', orderId: 'pedido-1', createdAt: '2026-08-24T17:00:00Z' },
      { id: 'ev-2', code: 'CAR', orderId: 'pedido-1', createdAt: '2026-08-24T17:02:00Z' },
      { id: 'ev-3', code: 'CAN', orderId: 'pedido-1', createdAt: '2026-08-24T17:02:01Z' },
    ]);

    expect(await adapter.fetchPending()).toHaveLength(0);
  });

  it('não trata evento de outro tipo como pedido', async () => {
    const { adapter } = adapterCom([
      { id: 'ev-1', code: 'DSP', orderId: 'pedido-1', createdAt: '2026-08-24T17:00:00Z' },
    ]);

    expect(await adapter.fetchPending()).toHaveLength(0);
  });

  it('reconhece TODOS os eventos consumidos, não só os importados', async () => {
    // Evento sem acknowledgment volta em todo polling e só expira em 8 horas.
    const { adapter, chamadas } = adapterCom([
      { id: 'ev-1', code: 'PLC', orderId: 'pedido-1', createdAt: '2026-08-24T17:00:00Z' },
      { id: 'ev-2', code: 'DSP', orderId: 'pedido-9', createdAt: '2026-08-24T17:00:00Z' },
      { id: 'ev-3', code: 'CON', orderId: 'pedido-8', createdAt: '2026-08-24T17:00:00Z' },
    ]);

    await adapter.fetchPending();
    await adapter.acknowledge(['pedido-1']);

    const ack = chamadas.find((c) => c.url.includes('acknowledgment'));
    expect(ack!.body).toEqual([{ id: 'ev-1' }, { id: 'ev-2' }, { id: 'ev-3' }]);
  });

  it('não reconhece o evento de um pedido que falhou ao ser lido', async () => {
    const chamadas: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        chamadas.push(url);
        if (url.includes('events:polling')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([
                { id: 'ev-1', code: 'PLC', orderId: 'pedido-1', createdAt: '2026-08-24T17:00:00Z' },
              ]),
          };
        }
        if (url.includes('acknowledgment')) return { ok: true, status: 202, text: async () => '' };
        // A leitura do pedido falha: o evento precisa continuar na fila para
        // uma nova tentativa no ciclo seguinte.
        return { ok: false, status: 500, text: async () => 'erro' };
      }),
    );

    const adapter = new IfoodOrderSource({ merchantId: 'loja-1', accessToken: async () => 'token' });

    expect(await adapter.fetchPending()).toHaveLength(0);
    await adapter.acknowledge([]);

    expect(chamadas.some((url) => url.includes('acknowledgment'))).toBe(false);
  });
});
