import { afterEach, describe, expect, it, vi } from 'vitest';
import { Food99Auth } from '@/infrastructure/integrations/99food/auth';

/**
 * A sequência de renovação do 99Food, medida contra a API deles.
 *
 * `refresh` responde `errno: 0` com `data` VAZIO — ele renova a autorização e
 * não devolve token. Quem devolve é o `get`. A primeira versão do adapter
 * devolvia o resultado do `refresh` direto e quebrava exatamente no caso que
 * ela existia para resolver: autorização vencida (`errno 10102`).
 */

const APP_ID = '5764607591429179549';
const SECRET = 'segredo';

function respostas(...corpos: string[]) {
  const fetchMock = vi.fn();
  for (const corpo of corpos) {
    fetchMock.mockResolvedValueOnce(new Response(corpo, { status: 200 }));
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const EXPIRADA = '{"errno":10102,"errmsg":"The store authorization information has expired"}';
const REFRESH_VAZIO = '{"errno":0,"errmsg":"ok","data":{}}';
const COM_TOKEN = '{"errno":0,"data":{"auth_token":"tok-novo","token_expiration_time":4102444800}}';

function auth() {
  return new Food99Auth({ appId: APP_ID, appSecret: SECRET });
}

function acoes(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((c) => new URL(String(c[0])).pathname.split('/').pop()!);
}

afterEach(() => vi.unstubAllGlobals());

describe('Food99Auth', () => {
  it('devolve o token direto quando a autorização está válida', async () => {
    const f = respostas(COM_TOKEN);

    const t = await auth().token('lojadeteste');

    expect(t.authToken).toBe('tok-novo');
    expect(acoes(f)).toEqual(['get']);
  });

  it('com autorização vencida, faz refresh e pede o token DE NOVO', async () => {
    const f = respostas(EXPIRADA, REFRESH_VAZIO, COM_TOKEN);

    const t = await auth().token('lojadeteste');

    expect(t.authToken).toBe('tok-novo');
    // É esta ordem que a plataforma exige — o refresh sozinho não resolve.
    expect(acoes(f)).toEqual(['get', 'refresh', 'get']);
  });

  it('não confunde o refresh vazio com um token', async () => {
    // Se o `get` pós-refresh também vier sem token, isso é falha — e não um
    // token vazio seguindo adiante para estourar como 401 em outra chamada.
    respostas(EXPIRADA, REFRESH_VAZIO, REFRESH_VAZIO);

    await expect(auth().token('lojadeteste')).rejects.toThrow(/auth_token/);
  });

  it('leva app_id, app_secret e app_shop_id na query', async () => {
    const f = respostas(COM_TOKEN);

    await auth().token('lojadeteste');

    const url = new URL(String(f.mock.calls[0][0]));
    expect(url.searchParams.get('app_id')).toBe(APP_ID);
    expect(url.searchParams.get('app_secret')).toBe(SECRET);
    expect(url.searchParams.get('app_shop_id')).toBe('lojadeteste');
  });

  it('trata epoch em segundos como segundos, não milissegundos', async () => {
    respostas(COM_TOKEN);

    const t = await auth().token('lojadeteste');

    // 4102444800 = 2100-01-01. Lido como ms cairia em 1970 e o token nasceria vencido.
    expect(t.expiraEm?.getUTCFullYear()).toBe(2100);
  });
});
