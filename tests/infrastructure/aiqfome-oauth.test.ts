import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '@/core';
import { AiqfomeOAuth } from '@/infrastructure/integrations/aiqfome/oauth';

const options = {
  clientId: 'cliente-123',
  clientSecret: 'segredo-456',
  redirectUri: 'https://levoentregas.vercel.app/api/integrations/aiqfome/callback',
  authorizationUrl: 'https://id.exemplo.com/oauth/authorize',
  tokenUrl: 'https://id.exemplo.com/oauth/token',
};

function respondWith(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('AiqfomeOAuth', () => {
  describe('buildAuthorizationUrl', () => {
    it('monta a URL de consentimento com o redirect exato', () => {
      const url = new URL(new AiqfomeOAuth(options).buildAuthorizationUrl('estado-abc'));

      expect(url.origin + url.pathname).toBe('https://id.exemplo.com/oauth/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('cliente-123');
      expect(url.searchParams.get('redirect_uri')).toBe(options.redirectUri);
      expect(url.searchParams.get('state')).toBe('estado-abc');
    });

    it('não manda scope quando não há um configurado', () => {
      // Palpite de escopo derruba a autorização com `invalid_scope`; sem o
      // parâmetro, valem os escopos marcados no cadastro do aplicativo.
      const url = new URL(new AiqfomeOAuth(options).buildAuthorizationUrl('estado-abc'));
      expect(url.searchParams.has('scope')).toBe(false);
    });

    it('manda o scope quando configurado', () => {
      const client = new AiqfomeOAuth({ ...options, scope: 'pedidos:ler' });
      const url = new URL(client.buildAuthorizationUrl('estado-abc'));

      expect(url.searchParams.get('scope')).toBe('pedidos:ler');
    });
  });

  describe('exchangeCode', () => {
    it('troca o código por token e calcula o vencimento', async () => {
      const fetchMock = respondWith({
        access_token: 'token-de-acesso',
        refresh_token: 'token-de-renovacao',
        scope: 'pedidos:ler',
        expires_in: 3600,
      });

      const antes = Date.now();
      const tokens = await new AiqfomeOAuth(options).exchangeCode('codigo-xyz');

      expect(tokens.accessToken).toBe('token-de-acesso');
      expect(tokens.refreshToken).toBe('token-de-renovacao');
      expect(tokens.expiresAt!.getTime()).toBeGreaterThanOrEqual(antes + 3600 * 1000);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(options.tokenUrl);
      expect(init.method).toBe('POST');

      // Credencial do cliente no cabeçalho, fora do corpo.
      const basic = Buffer.from('cliente-123:segredo-456').toString('base64');
      expect(init.headers.authorization).toBe(`Basic ${basic}`);

      const body = new URLSearchParams(init.body as URLSearchParams);
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('codigo-xyz');
      // O redirect vai de novo na troca, e precisa bater com o da autorização.
      expect(body.get('redirect_uri')).toBe(options.redirectUri);
    });

    it('aceita resposta sem validade declarada', async () => {
      respondWith({ access_token: 'token-de-acesso' });

      const tokens = await new AiqfomeOAuth(options).exchangeCode('codigo-xyz');

      expect(tokens.expiresAt).toBeNull();
      expect(tokens.refreshToken).toBeNull();
    });

    it('falha com o motivo do provedor quando a troca é recusada', async () => {
      respondWith({ error: 'invalid_grant' }, { ok: false, status: 400 });

      await expect(new AiqfomeOAuth(options).exchangeCode('codigo-velho')).rejects.toThrow(
        ExternalServiceError,
      );
      await expect(new AiqfomeOAuth(options).exchangeCode('codigo-velho')).rejects.toThrow(
        /invalid_grant/,
      );
    });

    it('falha quando a resposta vem sem access_token', async () => {
      respondWith({ token_type: 'Bearer' });

      await expect(new AiqfomeOAuth(options).exchangeCode('codigo-xyz')).rejects.toThrow(
        /sem access_token/,
      );
    });
  });

  describe('refresh', () => {
    it('renova usando o refresh token', async () => {
      const fetchMock = respondWith({ access_token: 'token-novo', expires_in: 60 });

      await new AiqfomeOAuth(options).refresh('token-de-renovacao');

      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as URLSearchParams);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('token-de-renovacao');
    });
  });
});
