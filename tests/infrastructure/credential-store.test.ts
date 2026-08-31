import { describe, expect, it, vi } from 'vitest';
import { ConfigurationError } from '@/core';
import { CredentialStore, type StoredTokens } from '@/infrastructure/integrations/credential-store';
import { decryptToken, encryptToken } from '@/infrastructure/security/token-cipher';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

/**
 * Prisma de mentira que MODELA a trava, em vez de fingir que ela existe.
 *
 * `$transaction` é serializado por uma fila, como o `FOR UPDATE` serializa no
 * Postgres, e o `upsert` altera a linha que o `findUnique` seguinte devolve.
 * Sem essas duas coisas, um teste de concorrência passaria mesmo com o código
 * errado — que é o pior tipo de teste verde.
 */
function fakePrisma(row: Record<string, unknown> | null) {
  let atual = row;
  const upsert = vi.fn(async (args: { update: Record<string, unknown>; create?: Record<string, string | null> }) => {
    atual = { ...(atual ?? {}), ...args.update };
    return {};
  });

  const modelo = {
    integrationCredential: {
      findUnique: vi.fn(async () => atual),
      upsert,
    },
  };

  let fila: Promise<unknown> = Promise.resolve();

  const client = {
    ...modelo,
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const minhaVez = fila.then(() =>
        fn({ ...modelo, $queryRaw: client.$queryRaw, $executeRawUnsafe: client.$executeRawUnsafe }),
      );
      fila = minhaVez.catch(() => undefined);
      return minhaVez;
    }),
  };

  return { client, upsert };
}

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    establishmentId: 'est-1',
    provider: 'IFOOD',
    accessToken: encrypted('token-atual'),
    refreshToken: encrypted('refresh-atual'),
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    merchantId: 'loja-1',
    scope: null,
    ...overrides,
  };
}

/** Cifra de verdade: um mock de cifra só provaria que o mock funciona. */
function encrypted(value: string) {
  return encryptToken(value, SECRET);
}

describe('CredentialStore', () => {
  it('devolve o token guardado quando ainda falta muito para expirar', async () => {
    const { client } = fakePrisma(storedRow());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    const renew = vi.fn();
    const token = await store.accessTokenFor('est-1', 'IFOOD', renew);

    expect(token).toBe('token-atual');
    expect(renew).not.toHaveBeenCalled();
  });

  it('renova quando está dentro da margem de expiração', async () => {
    // Falta 1 minuto: dentro da margem de 5, porque uma requisição em voo não
    // pode ficar segurando um token que vence no meio do caminho.
    const { client, upsert } = fakePrisma(
      storedRow({ expiresAt: new Date(Date.now() + 60 * 1000) }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    const renew = vi.fn(
      async (): Promise<StoredTokens> => ({
        accessToken: 'token-novo',
        refreshToken: 'refresh-novo',
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      }),
    );

    expect(await store.accessTokenFor('est-1', 'IFOOD', renew)).toBe('token-novo');
    expect(renew).toHaveBeenCalledWith('refresh-atual');

    // E o que foi gravado precisa estar cifrado.
    const gravado = upsert.mock.calls[0][0].update as Record<string, string>;
    expect(gravado.accessToken).not.toContain('token-novo');
    expect(decryptToken(gravado.accessToken, SECRET)).toBe('token-novo');
  });

  it('mantém o refresh token anterior quando a renovação não devolve um novo', async () => {
    const { client, upsert } = fakePrisma(
      storedRow({ expiresAt: new Date(Date.now() + 60 * 1000) }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    await store.accessTokenFor('est-1', 'IFOOD', async () => ({
      accessToken: 'token-novo',
      refreshToken: null,
      expiresAt: new Date(Date.now() + 3600_000),
    }));

    // Sobrescrever com null condenaria o lojista a reautorizar na próxima vez.
    const gravado = upsert.mock.calls[0][0].update as Record<string, string>;
    expect(decryptToken(gravado.refreshToken, SECRET)).toBe('refresh-atual');
  });

  it('preserva a loja vinculada quando a renovação não a repete', async () => {
    const { client, upsert } = fakePrisma(
      storedRow({ expiresAt: new Date(Date.now() + 60 * 1000) }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    await store.accessTokenFor('est-1', 'IFOOD', async () => ({
      accessToken: 'token-novo',
      refreshToken: 'refresh-novo',
      expiresAt: new Date(Date.now() + 3600_000),
    }));

    expect(upsert.mock.calls[0][0].update.merchantId).toBe('loja-1');
  });

  it('preserva a chave publicável e o ambiente quando a renovação não os repete', async () => {
    /*
     * O ambiente é o que mais dói perder aqui. A renovação do Mercado Pago nem
     * sempre repete `live_mode`, e uma conta de produção que voltasse como
     * `false` faria a tela anunciar "conta de teste" para quem está vendendo de
     * verdade — sem nada ter mudado do lado do lojista.
     */
    const { client, upsert } = fakePrisma(
      storedRow({
        provider: 'MERCADO_PAGO',
        expiresAt: new Date(Date.now() + 60 * 1000),
        publicKey: 'APP_USR-chave-publica',
        liveMode: true,
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    await store.accessTokenFor('est-1', 'MERCADO_PAGO', async () => ({
      accessToken: 'token-novo',
      refreshToken: 'refresh-novo',
      expiresAt: new Date(Date.now() + 3600_000),
      publicKey: null,
      liveMode: null,
    }));

    const gravado = upsert.mock.calls[0][0].update as Record<string, string>;
    expect(gravado.publicKey).toBe('APP_USR-chave-publica');
    expect(gravado.liveMode).toBe(true);
  });

  it('não renova quando não há validade declarada', async () => {
    const { client } = fakePrisma(storedRow({ expiresAt: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    const renew = vi.fn();
    expect(await store.accessTokenFor('est-1', 'IFOOD', renew)).toBe('token-atual');
    expect(renew).not.toHaveBeenCalled();
  });

  it('exige autorização quando o estabelecimento não tem credencial', async () => {
    const { client } = fakePrisma(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    await expect(store.accessTokenFor('est-1', 'IFOOD', vi.fn())).rejects.toThrow(
      ConfigurationError,
    );
  });

  it('exige nova autorização quando venceu e não há refresh token', async () => {
    const { client } = fakePrisma(
      storedRow({ expiresAt: new Date(Date.now() - 1000), refreshToken: null }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    await expect(store.accessTokenFor('est-1', 'IFOOD', vi.fn())).rejects.toThrow(
      /autorizar de novo/i,
    );
  });

  it('grava cifrado ao salvar', async () => {
    const { client, upsert } = fakePrisma(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    await store.save('est-1', 'IFOOD', {
      accessToken: 'token-em-claro',
      refreshToken: 'refresh-em-claro',
      expiresAt: null,
      merchantId: 'loja-9',
    });

    const criado = upsert.mock.calls[0][0].create as Record<string, string>;
    expect(criado.accessToken).not.toContain('token-em-claro');
    expect(decryptToken(criado.accessToken, SECRET)).toBe('token-em-claro');
    expect(decryptToken(criado.refreshToken, SECRET)).toBe('refresh-em-claro');
    expect(criado.merchantId).toBe('loja-9');
  });
});

describe('CredentialStore — credencial ilegível', () => {
  it('explica o que fazer quando o segredo não abre a credencial', async () => {
    /*
     * O erro cru do AES-GCM — "Unsupported state or unable to authenticate
     * data" — não menciona chave, credencial nem AUTH_SECRET, e apareceu a cada
     * 30 segundos no log do worker mandando quem investigava procurar no lugar
     * errado.
     */
    const { client } = fakePrisma(storedRow());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, 'outro-segredo-de-32-caracteres-ou-mais!');

    await expect(store.read('est-1', 'IFOOD')).rejects.toThrow(/AUTH_SECRET/);
    await expect(store.read('est-1', 'IFOOD')).rejects.toThrow(/Reconecte/);
  });

  /**
   * O caso que matou o token do aiqfome em 31/08.
   *
   * Dois workers na mesma loja renovaram ao mesmo tempo. O provedor rotaciona o
   * refresh token a cada renovação, então a segunda chamada invalidou o que a
   * primeira tinha acabado de gravar — e a integração morreu até o lojista
   * reautorizar no portal.
   *
   * Guardar a escrita não resolveria: o estrago está na CHAMADA duplicada, que
   * acontece antes de qualquer gravação. Por isso o teste é sobre quantas vezes
   * o provedor foi chamado, e não sobre qual valor sobrou gravado.
   */
  it('duas renovações simultâneas chamam o provedor uma vez só', async () => {
    const { client } = fakePrisma(
      storedRow({ expiresAt: new Date(Date.now() + 60 * 1000) }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    let rodadas = 0;
    const renew = vi.fn(async (): Promise<StoredTokens> => {
      rodadas += 1;
      // Latência de rede: sem ela, as duas chamadas não se sobrepõem e o teste
      // passaria mesmo sem trava nenhuma.
      await new Promise((r) => setTimeout(r, 20));
      return {
        accessToken: `token-${rodadas}`,
        refreshToken: `refresh-${rodadas}`,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };
    });

    const [a, b] = await Promise.all([
      store.accessTokenFor('est-1', 'AIQFOME', renew),
      store.accessTokenFor('est-1', 'AIQFOME', renew),
    ]);

    expect(renew).toHaveBeenCalledTimes(1);
    // Quem esperou recebe o token que o primeiro gravou, não um segundo.
    expect(a).toBe('token-1');
    expect(b).toBe('token-1');
  });

  it('quem espera pela trava não chama o provedor com o refresh token velho', async () => {
    const { client } = fakePrisma(
      storedRow({ expiresAt: new Date(Date.now() + 60 * 1000) }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new CredentialStore(client as any, SECRET);

    const usados: string[] = [];
    const renew = vi.fn(async (refreshToken: string): Promise<StoredTokens> => {
      usados.push(refreshToken);
      await new Promise((r) => setTimeout(r, 20));
      return {
        accessToken: 'token-novo',
        refreshToken: 'refresh-novo',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };
    });

    await Promise.all([
      store.accessTokenFor('est-1', 'AIQFOME', renew),
      store.accessTokenFor('est-1', 'AIQFOME', renew),
    ]);

    // O refresh velho e usado uma vez. Uma segunda chamada com ele e o que o
    // provedor responde com invalid_grant.
    expect(usados).toEqual(['refresh-atual']);
  });
});
