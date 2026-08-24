import { describe, expect, it, vi } from 'vitest';
import { ConfigurationError } from '@/core';
import { CredentialStore, type StoredTokens } from '@/infrastructure/integrations/credential-store';
import { decryptToken, encryptToken } from '@/infrastructure/security/token-cipher';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

/** Prisma de mentira, só com o que o store usa. */
function fakePrisma(row: Record<string, unknown> | null) {
  const upsert = vi.fn().mockResolvedValue({});
  return {
    client: { integrationCredential: { findUnique: vi.fn().mockResolvedValue(row), upsert } },
    upsert,
  };
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
    const gravado = upsert.mock.calls[0][0].update;
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
    const gravado = upsert.mock.calls[0][0].update;
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

    const criado = upsert.mock.calls[0][0].create;
    expect(criado.accessToken).not.toContain('token-em-claro');
    expect(decryptToken(criado.accessToken, SECRET)).toBe('token-em-claro');
    expect(decryptToken(criado.refreshToken, SECRET)).toBe('refresh-em-claro');
    expect(criado.merchantId).toBe('loja-9');
  });
});
