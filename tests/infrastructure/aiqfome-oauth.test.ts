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

    it('manda os escopos da credencial quando nenhum é configurado', () => {
      // Não é palpite: são os escopos que o próprio IdP devolve para esta
      // credencial. Omitir o parâmetro deixaria o consentimento sem permissão
      // de ler pedido, que é a única coisa que o Levô precisa.
      const url = new URL(new AiqfomeOAuth(options).buildAuthorizationUrl('estado-abc'));

      expect(url.searchParams.get('scope')).toBe(
        'aqf:menu:read aqf:order:create aqf:order:read aqf:store:read',
      );
    });

    it('deixa o lojista escolher a conta', () => {
      // Quem tem mais de um tenant no Magalu autorizaria pelo errado sem isto,
      // e o sintoma seria uma loja conectada que nunca recebe pedido.
      const url = new URL(new AiqfomeOAuth(options).buildAuthorizationUrl('estado-abc'));

      expect(url.searchParams.get('choose_tenants')).toBe('true');
    });

    it('manda o scope quando configurado', () => {
      const client = new AiqfomeOAuth({ ...options, scope: 'pedidos:ler' });
      const url = new URL(client.buildAuthorizationUrl('estado-abc'));

      expect(url.searchParams.get('scope')).toBe('pedidos:ler');
    });
  });

  describe('clientCredentials', () => {
    /*
     * Este é o fluxo verificado contra o ambiente real do aiqfome: a credencial
     * de parceiro emite token sozinha, com os escopos `aqf:*` do cadastro, e a
     * resposta não traz refresh_token.
     */
    it('pede token de parceiro sem lojista no meio', async () => {
      const fetchMock = respondWith({
        access_token: 'token-de-parceiro',
        token_type: 'Bearer',
        scope: 'aqf:menu:read aqf:order:create aqf:order:read aqf:store:read',
        expires_in: 7200,
      });

      const tokens = await new AiqfomeOAuth(options).clientCredentials();

      expect(tokens.accessToken).toBe('token-de-parceiro');
      expect(tokens.scope).toBe('aqf:menu:read aqf:order:create aqf:order:read aqf:store:read');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(options.tokenUrl);
      expect(String(init.body)).toBe('grant_type=client_credentials');
    });

    it('não manda escopo no pedido', async () => {
      // Os escopos vêm do cadastro do aplicativo. Pedir um subconjunto por
      // palpite só estreitaria o que já foi concedido.
      const fetchMock = respondWith({ access_token: 'token', expires_in: 7200 });

      await new AiqfomeOAuth({ ...options, scope: 'aqf:order:read' }).clientCredentials();

      expect(String(fetchMock.mock.calls[0][1].body)).not.toContain('scope');
    });

    it('aceita a ausência de refresh_token', async () => {
      // Modelo centralizado não tem sessão de usuário para renovar: quando o
      // token vence, pede-se outro. `null` aqui é o normal, não uma falha.
      respondWith({ access_token: 'token', expires_in: 7200 });

      const tokens = await new AiqfomeOAuth(options).clientCredentials();

      expect(tokens.refreshToken).toBeNull();
      expect(tokens.expiresAt).toBeInstanceOf(Date);
    });

    it('propaga a recusa do IdP com o corpo do erro', async () => {
      respondWith(
        { error: 'invalid_client', error_description: 'failed_to_authenticate' },
        { ok: false, status: 401 },
      );

      await expect(new AiqfomeOAuth(options).clientCredentials()).rejects.toThrow(
        /failed_to_authenticate/,
      );
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
