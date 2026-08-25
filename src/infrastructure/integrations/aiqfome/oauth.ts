import { ExternalServiceError } from '@/core';

/**
 * Autenticação do aiqfome, contra o ID Magalu.
 *
 * O token é **por loja**. A documentação da API V2 é explícita: o lojista
 * autoriza o aplicativo em cada loja dele, e cada uma tem seu próprio token.
 * Por isso o caminho é `authorization_code`, e por isso a credencial acaba no
 * `CredentialStore`, por estabelecimento — igual ao iFood.
 *
 * Isso foi confirmado do jeito mais direto possível: um token de parceiro
 * (`client_credentials`) atravessa o gateway sem problema e ainda assim leva
 * `401 Unauthorized` em `/api/v2/store` e `/api/v2/orders`. Ele identifica o
 * aplicativo; não representa loja nenhuma. Ver `clientCredentials`.
 */
export interface AiqfomeOAuthOptions {
  clientId: string;
  clientSecret: string;
  /**
   * Precisa ser **idêntico** ao cadastrado no portal do parceiro, caractere a
   * caractere. Provedor de OAuth compara por igualdade exata: uma barra final
   * sobrando já derruba a troca do código com `redirect_uri_mismatch`.
   */
  redirectUri: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  /** Ausente por padrão — valem os escopos marcados no cadastro do aplicativo. */
  scope?: string;
}

export interface AiqfomeTokens {
  accessToken: string;
  refreshToken: string | null;
  scope: string | null;
  /** `null` quando a resposta não informa validade. */
  expiresAt: Date | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  token_type?: string;
}

/*
 * Endereços do ID Magalu, como a documentação do aiqfome os publica.
 *
 * A descoberta OpenID em https://id.magalu.com/.well-known/openid-configuration
 * aponta para `autoseg-idp.luizalabs.com`, que também responde — mas o que o
 * aiqfome documenta e suporta é `id.magalu.com`, verificado com POST 200 no
 * endpoint de token. Entre os dois, vale o que eles dizem sustentar.
 */
const DEFAULT_AUTHORIZATION_URL = 'https://id.magalu.com/login';
const DEFAULT_TOKEN_URL = 'https://id.magalu.com/oauth/token';

/*
 * Os escopos que a credencial já carrega — lidos da resposta do próprio IdP,
 * não escolhidos por nós. Pedir menos do que foi concedido só tiraria função do
 * produto; pedir nome que não existe derruba a autorização com `invalid_scope`.
 */
const DEFAULT_SCOPE = 'aqf:menu:read aqf:order:create aqf:order:read aqf:store:read';

export class AiqfomeOAuth {
  private readonly authorizationUrl: string;
  private readonly tokenUrl: string;

  constructor(private readonly options: AiqfomeOAuthOptions) {
    this.authorizationUrl = options.authorizationUrl ?? DEFAULT_AUTHORIZATION_URL;
    this.tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL;
  }

  /**
   * Para onde mandar o lojista consentir.
   *
   * O endereço é `/login`, não `/oauth/authorize` — é o que o aiqfome documenta
   * para o vínculo de lojas, e o que a tela deles espera.
   *
   * Antes disso o lojista precisa ter ligado a loja ao ID Magalu no painel do
   * Geraldo, com **o mesmo e-mail**. Sem esse passo manual o consentimento
   * completa e não encontra loja nenhuma — falha silenciosa, do tipo que só
   * aparece quando o primeiro pedido não entra.
   */
  buildAuthorizationUrl(state: string): string {
    const url = new URL(this.authorizationUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.options.clientId);
    url.searchParams.set('redirect_uri', this.options.redirectUri);
    url.searchParams.set('state', state);
    // Deixa o lojista escolher com qual conta entrar; sem isto, quem tem mais
    // de um tenant no Magalu autoriza pelo errado sem perceber.
    url.searchParams.set('choose_tenants', 'true');

    // `AIQFOME_SCOPE` assume se o cadastro do aplicativo mudar, sem deploy.
    url.searchParams.set('scope', this.options.scope ?? DEFAULT_SCOPE);

    return url.toString();
  }

  /**
   * Token de parceiro — **não serve para ler pedidos**.
   *
   * A API responde `401` a ele: identifica o aplicativo, não a loja. Fica aqui
   * porque é a forma mais barata de checar se a credencial do parceiro está
   * viva: se isto falha, `client_id`/`client_secret` estão errados e não
   * adianta mandar o lojista consentir.
   *
   * Verificado contra o ambiente real: 200, escopos
   * `aqf:menu:read aqf:order:create aqf:order:read aqf:store:read`, 7200 s.
   */
  async clientCredentials(): Promise<AiqfomeTokens> {
    return this.requestToken({ grant_type: 'client_credentials' });
  }

  async exchangeCode(code: string): Promise<AiqfomeTokens> {
    return this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.options.redirectUri,
    });
  }

  async refresh(refreshToken: string): Promise<AiqfomeTokens> {
    return this.requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async requestToken(fields: Record<string, string>): Promise<AiqfomeTokens> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        // Credencial do cliente no cabeçalho, não no corpo: é o que o RFC 6749
        // recomenda, e mantém o segredo fora de log de corpo de requisição.
        authorization: `Basic ${basic(this.options.clientId, this.options.clientSecret)}`,
      },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      // O corpo do erro traz `error`/`error_description` do padrão OAuth e é o
      // que distingue segredo errado de código expirado — sem ele, o suporte
      // vira adivinhação.
      const detail = await response.text().catch(() => '');
      throw new ExternalServiceError(
        'aiqfome',
        `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const payload = (await response.json()) as TokenResponse;

    if (!payload.access_token) {
      throw new ExternalServiceError('aiqfome', 'Resposta sem access_token');
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      scope: payload.scope ?? null,
      expiresAt:
        typeof payload.expires_in === 'number'
          ? new Date(Date.now() + payload.expires_in * 1000)
          : null,
    };
  }
}

function basic(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}
