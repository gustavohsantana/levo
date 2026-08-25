import { ConfigurationError } from '@/core';
import { env } from '@/env';
import { AiqfomeOAuth, type AiqfomeTokens } from './oauth';

/**
 * O `redirect_uri`, num lugar só.
 *
 * Ele é cadastrado no portal do parceiro e conferido por igualdade exata na
 * troca do código. Derivar do `PUBLIC_BASE_URL` em vez de repetir a URL numa
 * variável própria elimina a classe inteira de erro em que produção e cadastro
 * divergem por um caractere — e faz o valor certo aparecer sozinho quando o
 * domínio mudar.
 *
 * Trocar de domínio, porém, **exige atualizar o cadastro no aiqfome**: é lá que
 * mora a outra ponta da comparação.
 */
export function aiqfomeRedirectUri(): string {
  return new URL('/api/integrations/aiqfome/callback', env().PUBLIC_BASE_URL).toString();
}

export function aiqfomeOAuth(): AiqfomeOAuth {
  const config = env();

  if (!config.AIQFOME_CLIENT_ID || !config.AIQFOME_CLIENT_SECRET) {
    throw new ConfigurationError(
      'aiqfome: AIQFOME_CLIENT_ID e AIQFOME_CLIENT_SECRET são obrigatórios para o consentimento',
    );
  }

  return new AiqfomeOAuth({
    clientId: config.AIQFOME_CLIENT_ID,
    clientSecret: config.AIQFOME_CLIENT_SECRET,
    redirectUri: aiqfomeRedirectUri(),
    authorizationUrl: config.AIQFOME_AUTH_URL,
    tokenUrl: config.AIQFOME_TOKEN_URL,
    scope: config.AIQFOME_SCOPE,
  });
}

/**
 * O token de uma loja, renovado quando precisa.
 *
 * Mesma forma do iFood: quem guarda, cifra e renova é o `CredentialStore`. O
 * aiqfome devolve `refresh_token` no consentimento, então renovar não obriga o
 * lojista a autorizar de novo a cada duas horas.
 */
export function aiqfomeAccessTokenFor(
  store: {
    accessTokenFor: (
      establishmentId: string,
      provider: 'AIQFOME',
      refresh: (refreshToken: string) => Promise<AiqfomeTokens>,
    ) => Promise<string>;
  },
  establishmentId: string,
): () => Promise<string> {
  const oauth = aiqfomeOAuth();
  return () =>
    store.accessTokenFor(establishmentId, 'AIQFOME', (refreshToken) =>
      oauth.refresh(refreshToken),
    );
}
