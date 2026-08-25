import { describe, expect, it, vi } from 'vitest';
import { AiqfomeTokenProvider } from '@/infrastructure/integrations/aiqfome/token-provider';
import type { AiqfomeOAuth } from '@/infrastructure/integrations/aiqfome/oauth';

/**
 * O aiqfome não emite `refresh_token`: token vencido se troca por outro. Isso
 * faz do cache parte do desenho, não otimização — sem ele o worker pediria um
 * token novo a cada 30 s para substituir um que dura duas horas.
 */
function oauthFalso(validadeMs: number | null) {
  const clientCredentials = vi.fn(async () => ({
    accessToken: `token-${clientCredentials.mock.calls.length}`,
    refreshToken: null,
    scope: 'aqf:order:read',
    expiresAt: validadeMs === null ? null : new Date(Date.now() + validadeMs),
  }));

  return { clientCredentials } as unknown as AiqfomeOAuth & {
    clientCredentials: typeof clientCredentials;
  };
}

const DUAS_HORAS = 2 * 60 * 60 * 1000;

describe('AiqfomeTokenProvider', () => {
  it('reaproveita o token enquanto ele vale', async () => {
    const oauth = oauthFalso(DUAS_HORAS);
    const provider = new AiqfomeTokenProvider(oauth);

    expect(await provider.accessToken()).toBe('token-1');
    expect(await provider.accessToken()).toBe('token-1');
    expect(oauth.clientCredentials).toHaveBeenCalledTimes(1);
  });

  it('pede outro quando o prazo está perto do fim', async () => {
    // Dentro da margem de 5 min: vale renovar antes de o ciclo usar um token
    // que morre no meio da chamada.
    const oauth = oauthFalso(60 * 1000);
    const provider = new AiqfomeTokenProvider(oauth);

    await provider.accessToken();
    await provider.accessToken();

    expect(oauth.clientCredentials).toHaveBeenCalledTimes(2);
  });

  it('não guarda token sem validade declarada', async () => {
    const oauth = oauthFalso(null);
    const provider = new AiqfomeTokenProvider(oauth);

    await provider.accessToken();
    await provider.accessToken();

    expect(oauth.clientCredentials).toHaveBeenCalledTimes(2);
  });

  it('compartilha um pedido em voo entre chamadas simultâneas', async () => {
    const oauth = oauthFalso(DUAS_HORAS);
    const provider = new AiqfomeTokenProvider(oauth);

    // Dois estabelecimentos no mesmo tick não podem virar duas trocas.
    const [a, b] = await Promise.all([provider.accessToken(), provider.accessToken()]);

    expect(a).toBe(b);
    expect(oauth.clientCredentials).toHaveBeenCalledTimes(1);
  });

  it('não deixa uma falha envenenar o cache', async () => {
    const oauth = oauthFalso(DUAS_HORAS);
    oauth.clientCredentials.mockRejectedValueOnce(new Error('IdP fora do ar'));
    const provider = new AiqfomeTokenProvider(oauth);

    await expect(provider.accessToken()).rejects.toThrow('IdP fora do ar');

    // A tentativa seguinte precisa poder acontecer: uma queda momentânea do
    // provedor não pode deixar o worker travado até reiniciarem o processo.
    expect(await provider.accessToken()).toBe('token-2');
  });
});
