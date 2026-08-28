import { ConfigurationError } from '@/core';
import { env } from '@/env';
import { MercadoPagoOAuth, type MercadoPagoTokens } from './oauth';

/**
 * O `redirect_uri`, num lugar só.
 *
 * Derivado do `PUBLIC_BASE_URL` pelo mesmo motivo do aiqfome: repetir a URL numa
 * variável própria cria a classe de erro em que produção e cadastro divergem por
 * um caractere. Trocar de domínio continua exigindo atualizar o cadastro em
 * "Suas integrações" — é lá que mora a outra ponta da comparação.
 */
export function mercadoPagoRedirectUri(): string {
  return new URL('/api/integrations/mercadopago/callback', env().PUBLIC_BASE_URL).toString();
}

export function mercadoPagoOAuth(): MercadoPagoOAuth {
  const config = env();
  const clientId = config.MERCADO_PAGO_CLIENT_ID;
  const clientSecret = config.MERCADO_PAGO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ConfigurationError(
      'Mercado Pago: MERCADO_PAGO_CLIENT_ID e MERCADO_PAGO_CLIENT_SECRET são obrigatórios ' +
        'para o consentimento do lojista',
    );
  }

  return new MercadoPagoOAuth({
    clientId,
    clientSecret,
    redirectUri: mercadoPagoRedirectUri(),
  });
}

/**
 * Public Key + Access Token do painel, no nome que o Mercado Pago usa.
 *
 * `producao` é o par da aba de produção. `teste` é o da aba de teste, e some
 * em `NODE_ENV=production` para o token sandbox não receber Pix de lojista.
 */
export function mercadoPagoEnvCredentials(
  modo: 'teste' | 'producao',
): { publicKey: string; accessToken: string } | null {
  const config = env();

  if (modo === 'teste') {
    const publicKey = config.MERCADO_PAGO_PUBLIC_KEY_TEST;
    const accessToken = config.MERCADO_PAGO_ACCESS_TOKEN_TEST;
    if (!config.mercadoPagoTestEnabled || !publicKey || !accessToken) return null;
    return { publicKey, accessToken };
  }

  const publicKey = config.MERCADO_PAGO_PUBLIC_KEY;
  const accessToken = config.MERCADO_PAGO_ACCESS_TOKEN;
  if (!config.mercadoPagoProdEnabled || !publicKey || !accessToken) return null;
  return { publicKey, accessToken };
}

/**
 * Token de uma loja, renovado quando precisa.
 *
 * O access token do Mercado Pago vale cerca de 180 dias e vem com refresh, então
 * na prática o lojista autoriza uma vez e não pensa mais nisso — desde que o
 * refresh aconteça. Quem decide *quando* renovar é o `CredentialStore`; quem
 * sabe *como* é isto aqui.
 */
export function mercadoPagoAccessTokenFor(
  store: {
    accessTokenFor: (
      establishmentId: string,
      provider: 'MERCADO_PAGO',
      refresh: (refreshToken: string) => Promise<MercadoPagoTokens>,
    ) => Promise<string>;
  },
  establishmentId: string,
): () => Promise<string> {
  /*
   * O cliente OAuth é montado dentro da função, e não aqui fora, porque
   * `mercadoPagoOAuth()` lança quando faltam as credenciais do ambiente. Lá
   * fora, isso seria uma exceção **síncrona** na montagem — que escapa do
   * `.catch()` de quem chama e derruba a tela de Integrações inteira por causa
   * de uma variável não preenchida. Dentro, vira uma promise rejeitada, que é
   * o que todo mundo já sabe tratar. E o cliente só é preciso quando há
   * renovação de verdade, que é raro.
   */
  return async () =>
    store.accessTokenFor(establishmentId, 'MERCADO_PAGO', (refreshToken) =>
      mercadoPagoOAuth().refresh(refreshToken),
    );
}
