import { ConfigurationError } from '@/core';
import { env } from '@/env';
import { AiqfomeOAuth } from './oauth';
import { AiqfomeTokenProvider } from './token-provider';

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
 * Um provedor por processo.
 *
 * A credencial é do parceiro, não do lojista, então o token serve todos os
 * estabelecimentos — e um cache de módulo evita que cada tick do worker peça
 * um token novo para algo que dura duas horas.
 */
let provider: AiqfomeTokenProvider | null = null;

export function aiqfomeAccessToken(): () => Promise<string> {
  provider ??= new AiqfomeTokenProvider(aiqfomeOAuth());
  return () => provider!.accessToken();
}
