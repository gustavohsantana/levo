import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contaAceitaPix,
  lerContaMercadoPago,
} from '@/infrastructure/payments/mercadopago/account';

/**
 * Duas perguntas com confiabilidade diferente: qual é a conta (exato) e se ela
 * consegue receber Pix (indício). O que se testa aqui é sobretudo que o segundo
 * caso não seja tratado como certeza — recusar a conexão de uma loja que
 * funcionaria é o pior erro possível numa tela de onboarding.
 */
function stubRespostas(rotas: Record<string, { ok: boolean; body: unknown }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const rota = Object.keys(rotas).find((caminho) => String(url).includes(caminho));
    if (!rota) return { ok: false, status: 404, json: async () => ({}) };

    return {
      ok: rotas[rota].ok,
      status: rotas[rota].ok ? 200 : 401,
      json: async () => rotas[rota].body,
    };
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('lerContaMercadoPago', () => {
  it('identifica a conta autorizada', async () => {
    // Nome e e-mail existem para o lojista com conta pessoal e conta da empresa
    // perceber sozinho que conectou a errada.
    stubRespostas({
      '/users/me': {
        ok: true,
        body: {
          id: 987654321,
          nickname: 'PIZZARIALEVO',
          first_name: 'Maria',
          last_name: 'Souza',
          email: 'maria@pizzaria.com.br',
        },
      },
      '/v1/payment_methods': { ok: true, body: [{ id: 'pix', status: 'active' }] },
    });

    const conta = await lerContaMercadoPago('token');

    expect(conta).toEqual({
      id: '987654321',
      nome: 'Maria Souza',
      email: 'maria@pizzaria.com.br',
    });
  });

  it('não gasta chamada perguntando pelo Pix', async () => {
    /*
     * Quem identifica a conta é a tela de Integrações, a cada abertura. Se o
     * Pix fosse consultado junto, toda carga da página pagaria por uma segunda
     * ida à rede cujo resultado só interessa uma vez, no consentimento.
     */
    const fetchMock = stubRespostas({
      '/users/me': { ok: true, body: { id: 1, nickname: 'LOJA' } },
      '/v1/payment_methods': { ok: true, body: [{ id: 'pix' }] },
    });

    await lerContaMercadoPago('token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/users/me');
  });

  it('cai para o apelido quando não há nome', async () => {
    stubRespostas({
      '/users/me': { ok: true, body: { id: 1, nickname: 'PIZZARIALEVO' } },
      '/v1/payment_methods': { ok: true, body: [{ id: 'pix' }] },
    });

    expect((await lerContaMercadoPago('token'))?.nome).toBe('PIZZARIALEVO');
  });

  it('devolve null quando o token não vale mais', async () => {
    // É o que distingue "nunca conectou" de "o lojista revogou o acesso ontem" —
    // e a diferença entre os dois é o Pix sumir do cardápio em silêncio.
    stubRespostas({ '/users/me': { ok: false, body: {} } });

    expect(await lerContaMercadoPago('token-revogado')).toBeNull();
  });

  it('sobrevive à rede fora do ar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNRESET');
      }),
    );

    // Sem conta não há como afirmar nada; o que importa é não derrubar a tela.
    expect(await lerContaMercadoPago('token')).toBeNull();
  });
});

describe('contaAceitaPix', () => {
  it('reconhece a conta habilitada', async () => {
    stubRespostas({
      '/v1/payment_methods': { ok: true, body: [{ id: 'pix', status: 'active' }] },
    });

    expect(await contaAceitaPix('token')).toBe(true);
  });

  it('acusa a conta sem Pix na lista', async () => {
    stubRespostas({
      '/v1/payment_methods': { ok: true, body: [{ id: 'master' }, { id: 'visa' }] },
    });

    expect(await contaAceitaPix('token')).toBe(false);
  });

  it('trata Pix desativado como ausente', async () => {
    stubRespostas({
      '/v1/payment_methods': { ok: true, body: [{ id: 'pix', status: 'deactive' }] },
    });

    expect(await contaAceitaPix('token')).toBe(false);
  });

  it('não confunde consulta falhada com conta incapaz', async () => {
    /*
     * `null` é desconhecido, não "não". Quem chama deixa passar, em vez de
     * recusar a conexão — a rede fora do ar não pode barrar um lojista cuja
     * conta está perfeita.
     */
    stubRespostas({ '/v1/payment_methods': { ok: false, body: {} } });

    expect(await contaAceitaPix('token')).toBeNull();
  });
});
