import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '@/core';
import { MercadoPagoOAuth } from '@/infrastructure/payments/mercadopago/oauth';

const options = {
  clientId: 'app-123',
  clientSecret: 'segredo-456',
  redirectUri: 'https://levoentregas.vercel.app/api/integrations/mercadopago/callback',
  authorizationUrl: 'https://auth.exemplo.com/authorization',
  tokenUrl: 'https://api.exemplo.com/oauth/token',
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

function corpoDa(fetchMock: ReturnType<typeof respondWith>) {
  return new URLSearchParams(fetchMock.mock.calls[0][1].body as URLSearchParams);
}

afterEach(() => vi.unstubAllGlobals());

describe('MercadoPagoOAuth', () => {
  describe('buildAuthorizationUrl', () => {
    it('monta a URL de consentimento com o redirect exato', () => {
      const url = new URL(new MercadoPagoOAuth(options).buildAuthorizationUrl('estado-abc'));

      expect(url.origin + url.pathname).toBe('https://auth.exemplo.com/authorization');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('app-123');
      expect(url.searchParams.get('redirect_uri')).toBe(options.redirectUri);
      expect(url.searchParams.get('state')).toBe('estado-abc');
    });

    it('identifica a plataforma', () => {
      // Sem `platform_id`, o lojista chega numa tela que não sabe qual produto
      // pede consentimento, e o retorno vem sem código e sem erro que explique.
      const url = new URL(new MercadoPagoOAuth(options).buildAuthorizationUrl('estado-abc'));

      expect(url.searchParams.get('platform_id')).toBe('mp');
    });

    it('nunca leva o client_secret para o navegador', () => {
      const url = new MercadoPagoOAuth(options).buildAuthorizationUrl('estado-abc');

      expect(url).not.toContain('segredo-456');
    });
  });

  describe('exchangeCode', () => {
    it('guarda quem recebe o dinheiro e a chave publicável', async () => {
      // `user_id` é o vendedor: é a conta em que o Pix vai cair. `public_key`
      // volta junto e é o que o front vai usar quando entrar cartão.
      respondWith({
        access_token: 'token-do-lojista',
        refresh_token: 'token-de-renovacao',
        public_key: 'APP_USR-chave-publica',
        user_id: 987654321,
        live_mode: true,
        scope: 'offline_access payments write',
        expires_in: 15552000,
      });

      const tokens = await new MercadoPagoOAuth(options).exchangeCode('codigo-xyz');

      expect(tokens.accessToken).toBe('token-do-lojista');
      expect(tokens.refreshToken).toBe('token-de-renovacao');
      expect(tokens.publicKey).toBe('APP_USR-chave-publica');
      expect(tokens.merchantId).toBe('987654321');
      expect(tokens.liveMode).toBe(true);
    });

    it('manda as credenciais no corpo, não em Basic', async () => {
      /*
       * É o contrário do aiqfome, e de propósito: o endpoint do Mercado Pago
       * documenta client_id e client_secret como campos do corpo, e responde
       * invalid_client a quem manda no cabeçalho.
       */
      const fetchMock = respondWith({ access_token: 'token' });

      await new MercadoPagoOAuth(options).exchangeCode('codigo-xyz');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(options.tokenUrl);
      expect(init.method).toBe('POST');
      expect(init.headers.authorization).toBeUndefined();

      const body = corpoDa(fetchMock);
      expect(body.get('client_id')).toBe('app-123');
      expect(body.get('client_secret')).toBe('segredo-456');
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('codigo-xyz');
      // O redirect vai de novo na troca e precisa bater com o da autorização.
      expect(body.get('redirect_uri')).toBe(options.redirectUri);
    });

    it('nunca pede comissão da venda', async () => {
      // O dinheiro é do lojista. `application_fee` é o campo que transformaria o
      // Levô em intermediador com percentual por pedido — e ele não aparece em
      // lugar nenhum do fluxo, o que é uma decisão, não um esquecimento.
      const fetchMock = respondWith({ access_token: 'token' });

      await new MercadoPagoOAuth(options).exchangeCode('codigo-xyz');

      expect(String(fetchMock.mock.calls[0][1].body)).not.toContain('application_fee');
      expect(String(fetchMock.mock.calls[0][1].body)).not.toContain('marketplace_fee');
    });

    it('trata ausência de live_mode como teste', async () => {
      // Conectar em sandbox achando que é produção custa vendas que ninguém
      // cobra. O inverso custa um aviso a mais na tela.
      respondWith({ access_token: 'token' });

      const tokens = await new MercadoPagoOAuth(options).exchangeCode('codigo-xyz');

      expect(tokens.liveMode).toBe(false);
    });

    it('aceita resposta sem validade declarada', async () => {
      respondWith({ access_token: 'token' });

      const tokens = await new MercadoPagoOAuth(options).exchangeCode('codigo-xyz');

      expect(tokens.expiresAt).toBeNull();
      expect(tokens.refreshToken).toBeNull();
      expect(tokens.publicKey).toBeNull();
    });

    it('calcula o vencimento a partir de expires_in', async () => {
      respondWith({ access_token: 'token', expires_in: 15552000 });

      const antes = Date.now();
      const tokens = await new MercadoPagoOAuth(options).exchangeCode('codigo-xyz');

      expect(tokens.expiresAt!.getTime()).toBeGreaterThanOrEqual(antes + 15552000 * 1000);
    });

    it('propaga a recusa com o corpo do erro', async () => {
      // É o corpo que distingue segredo errado de redirect_uri divergente — sem
      // ele, o suporte vira adivinhação.
      respondWith(
        { error: 'invalid_grant', message: 'invalid redirect_uri' },
        { ok: false, status: 400 },
      );

      const client = new MercadoPagoOAuth(options);

      await expect(client.exchangeCode('codigo-velho')).rejects.toThrow(ExternalServiceError);
      await expect(client.exchangeCode('codigo-velho')).rejects.toThrow(/invalid redirect_uri/);
    });

    it('falha quando a resposta vem sem access_token', async () => {
      respondWith({ token_type: 'bearer' });

      await expect(new MercadoPagoOAuth(options).exchangeCode('codigo-xyz')).rejects.toThrow(
        /sem access_token/,
      );
    });
  });

  describe('refresh', () => {
    it('renova usando o refresh token', async () => {
      const fetchMock = respondWith({ access_token: 'token-novo', expires_in: 15552000 });

      await new MercadoPagoOAuth(options).refresh('token-de-renovacao');

      const body = corpoDa(fetchMock);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('token-de-renovacao');
      expect(body.get('client_id')).toBe('app-123');
    });
  });
});
