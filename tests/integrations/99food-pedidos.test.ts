import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '@/core';
import { Food99Pedidos } from '@/infrastructure/integrations/99food/pedidos';
import type { Food99Auth } from '@/infrastructure/integrations/99food/auth';

/**
 * O que estes testes protegem é o caminho de saída: o id que o Levô MANDA para
 * o 99Food. O de entrada (webhook) tem os seus em `99food-webhook-protocol`.
 *
 * O id usado é o real da loja de teste, e o arredondamento que ele sofre no
 * `JSON.parse` é de 511 unidades — medido contra a API deles.
 */

const ORDER_ID = '5764617763114451489';
const SHOP = 'lojadeteste';

/** Auth de mentira: estes testes são sobre o adapter, não sobre o token. */
const auth = {
  token: async () => ({ authToken: 'tok-123', expiraEm: null }),
} as unknown as Food99Auth;

function comResposta(corpo: string, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn(async () => new Response(corpo, init));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function urlChamada(fetchMock: ReturnType<typeof vi.fn>): URL {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

afterEach(() => vi.unstubAllGlobals());

describe('Food99Pedidos', () => {
  const pedidos = () => new Food99Pedidos({ auth, appShopId: SHOP });

  it('manda o order_id sem arredondar', async () => {
    const f = comResposta('{"errno":0,"errmsg":"ok","data":{}}');

    await pedidos().confirmar(ORDER_ID);

    const url = urlChamada(f);
    expect(url.searchParams.get('order_id')).toBe(ORDER_ID);
    // A prova de que passar por number teria estragado.
    expect(String(Number(ORDER_ID))).not.toBe(ORDER_ID);
  });

  it('leva token e app_shop_id em toda chamada', async () => {
    const f = comResposta('{"errno":0,"data":{}}');

    await pedidos().pronto(ORDER_ID);

    const url = urlChamada(f);
    expect(url.pathname).toBe('/v1/order/order/ready');
    expect(url.searchParams.get('auth_token')).toBe('tok-123');
    expect(url.searchParams.get('app_shop_id')).toBe(SHOP);
  });

  it('preserva ids grandes também na RESPOSTA', async () => {
    comResposta(`{"errno":0,"data":{"order_id":${ORDER_ID}}}`);

    const dados = (await pedidos().detalhe(ORDER_ID)) as { order_id: string };

    expect(dados.order_id).toBe(ORDER_ID);
  });

  it('trata errno != 0 como falha, mesmo com HTTP 200', async () => {
    comResposta(
      '{"errno":10101,"errmsg":"The store authorization information does not exist","requestId":"abc123"}',
    );

    await expect(pedidos().confirmar(ORDER_ID)).rejects.toThrow(ExternalServiceError);
  });

  it('carrega o requestId no erro — é o que o suporte deles pede', async () => {
    comResposta('{"errno":10005,"errmsg":"rate limit","requestId":"req-xyz"}');

    const erro = await pedidos()
      .detalhe(ORDER_ID)
      .catch((e: ExternalServiceError) => e);

    expect((erro as ExternalServiceError).details).toMatchObject({
      errno: 10005,
      requestId: 'req-xyz',
    });
  });

  it('traduz recusa de cancelamento em agree=2', async () => {
    const f = comResposta('{"errno":0,"data":{}}');

    await pedidos().responderCancelamento(ORDER_ID, false);

    expect(urlChamada(f).searchParams.get('agree')).toBe('2');
  });

  it('manda o motivo quando cancela', async () => {
    const f = comResposta('{"errno":0,"data":{}}');

    await pedidos().cancelar(ORDER_ID, { reasonId: 7, reason: 'sem ingrediente' });

    const url = urlChamada(f);
    expect(url.searchParams.get('reason_id')).toBe('7');
    expect(url.searchParams.get('reason')).toBe('sem ingrediente');
  });

  it('omite o motivo quando não há', async () => {
    const f = comResposta('{"errno":0,"data":{}}');

    await pedidos().cancelar(ORDER_ID);

    expect(urlChamada(f).searchParams.has('reason_id')).toBe(false);
  });
});
