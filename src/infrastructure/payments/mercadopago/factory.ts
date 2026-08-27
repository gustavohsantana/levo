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

  if (!config.MERCADO_PAGO_CLIENT_ID || !config.MERCADO_PAGO_CLIENT_SECRET) {
    throw new ConfigurationError(
      'Mercado Pago: MERCADO_PAGO_CLIENT_ID e MERCADO_PAGO_CLIENT_SECRET são obrigatórios ' +
        'para o consentimento do lojista',
    );
  }

  return new MercadoPagoOAuth({
    clientId: config.MERCADO_PAGO_CLIENT_ID,
    clientSecret: config.MERCADO_PAGO_CLIENT_SECRET,
    redirectUri: mercadoPagoRedirectUri(),
  });
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
