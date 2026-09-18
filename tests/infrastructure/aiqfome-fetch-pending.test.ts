import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiqfomeOrderSource } from '@/infrastructure/integrations/aiqfome/adapter';

/**
 * A lista e o detalhe do aiqfome não falam a mesma língua.
 *
 * `/api/v2/orders` devolve `order_id` e `order_is_pickup` e não traz endereço
 * nem valor; `/api/v2/orders/:id` devolve `id`, `is_pickup`, `user` e
 * `payment_method`. Sem buscar o detalhe, a importação monta parada sem rua e
 * com `externalId: "undefined"` — que foi exatamente o que aconteceu no
 * primeiro pedido real.
 */
const DETALHE = {
  id: 140036851,
  is_pickup: false,
  order_observations: '',
  user: {
    name: 'Gustavo',
    surname: 'Henrique',
    phone_number: '(12) 9-8250-8466',
    address: { street: 'Rua A', number: 10, neighborhood: 'Centro', city: 'Pouso Alegre' },
  },
  payment_method: { total: '69.00' },
  timeline: { created_at: '2026-08-25 21:17:58', timezone: 'America/Sao_Paulo' },
};

function servidor(lista: unknown[], detalhe: unknown = DETALHE) {
  const chamadas: string[] = [];

  const fetchMock = vi.fn(async (url: URL | string) => {
    const alvo = String(url);
    chamadas.push(alvo);

    const corpo = alvo.includes('/orders/') ? detalhe : lista;
    return { ok: true, status: 200, json: async () => ({ data: corpo }) };
  });

  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  return chamadas;
}

function source() {
  return new AiqfomeOrderSource({
    accessToken: async () => 'token-de-loja',
    storeId: '144428',
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('AiqfomeOrderSource.fetchPending', () => {
  it('busca o detalhe de cada pedido listado', async () => {
    const chamadas = servidor([{ order_id: 140036851, order_is_pickup: false }]);

    const pedidos = await source().fetchPending();

    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].externalId).toBe('140036851');
    expect(pedidos[0].customerName).toBe('Gustavo Henrique');
    expect(pedidos[0].address).toBe('Rua A, 10 - Centro - Pouso Alegre');
    expect(pedidos[0].amountCents).toBe(6_900);

    expect(chamadas[0]).toContain('filter%5Bstore_ids%5D=144428');
    expect(chamadas[1]).toContain('/api/v2/orders/140036851');
  });

  it('importa a retirada marcada como pickup', async () => {
    /*
     * Antes a retirada era pulada — mas isso obrigava o dono a vigiar o app do
     * aiqfome para os pedidos de balcão, e o Levô existe para centralizar tudo.
     * Agora ela entra, com `fulfillment: 'PICKUP'`; quem a mantém fora da rota
     * é o domínio (`Order.entraEmRota`), não o adapter.
     *
     * O flag autoritativo é o `order_is_pickup` do RESUMO — o detalhe nem sempre
     * repete, então o resumo manda.
     */
    const chamadas = servidor([{ order_id: 140036851, order_is_pickup: true }]);

    const pedidos = await source().fetchPending();

    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]?.fulfillment).toBe('PICKUP');
    // Busca o detalhe também: lista + detalhe.
    expect(chamadas).toHaveLength(2);
  });

  it('aceita também os nomes do detalhe na lista', async () => {
    // Se alinharem os nomes um dia, a importação não pode quebrar por isso.
    const chamadas = servidor([{ id: 140036851, is_pickup: false }]);

    expect(await source().fetchPending()).toHaveLength(1);
    expect(chamadas[1]).toContain('/api/v2/orders/140036851');
  });

  it('descarta item de lista sem id em vez de pedir /orders/undefined', async () => {
    const chamadas = servidor([{ order_is_pickup: false }]);

    expect(await source().fetchPending()).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  it('devolve vazio quando não há pedido', async () => {
    servidor([]);
    expect(await source().fetchPending()).toEqual([]);
  });
});
