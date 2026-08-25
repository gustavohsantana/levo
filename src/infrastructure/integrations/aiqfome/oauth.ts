import { ExternalServiceError } from '@/core';

/**
 * Fluxo *authorization code* do aiqfome.
 *
 * ⚠️  **Escrito contra a documentação pública, ainda não homologado** — mesma
 * ressalva do adapter de pedidos. Os endereços de autorização e de token são
 * configuráveis por variável de ambiente justamente porque o credenciamento
 * (API V2 / ID Magalu) é quem fecha esses valores; quando o acesso sair, ligar
 * é conferir os nomes de campo contra o ambiente real, não reescrever o fluxo.
 *
 * Por que *authorization code* e não uma chave estática: quem autoriza é o
 * lojista, na conta dele, e o consentimento pode ser revogado. É o modelo que
 * a plataforma exige, e o que faz sentido para um produto multi-estabelecimento.
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
 * Endereços do provedor de identidade, lidos da descoberta OpenID publicada em
 * https://id.magalu.com/.well-known/openid-configuration.
 *
 * O domínio que atende é `autoseg-idp.luizalabs.com`; `id.magalu.com` só serve
 * o documento de descoberta. Escrever o palpite óbvio — /oauth/token no mesmo
 * domínio — dá 404, e o erro não sugere em nenhum momento que o host é outro.
 *
 * Se mudarem, a descoberta continua sendo a fonte: consulte-a antes de editar
 * estas constantes.
 */
const DEFAULT_AUTHORIZATION_URL = 'https://autoseg-idp.luizalabs.com/oauth/authorize';
const DEFAULT_TOKEN_URL = 'https://autoseg-idp.luizalabs.com/oauth/token';

export class AiqfomeOAuth {
  private readonly authorizationUrl: string;
  private readonly tokenUrl: string;

  constructor(private readonly options: AiqfomeOAuthOptions) {
    this.authorizationUrl = options.authorizationUrl ?? DEFAULT_AUTHORIZATION_URL;
    this.tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL;
  }

  /** Para onde mandar o lojista consentir. */
  buildAuthorizationUrl(state: string): string {
    const url = new URL(this.authorizationUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.options.clientId);
    url.searchParams.set('redirect_uri', this.options.redirectUri);
    url.searchParams.set('state', state);

    /*
     * O escopo é declarado no cadastro do aplicativo, no portal do parceiro —
     * o formulário tem caixas para "ver pedidos", "editar loja" e afins. Como
     * os identificadores desses escopos não são públicos, mandar um palpite
     * aqui derruba a autorização com `invalid_scope`, que é um erro bem menos
     * óbvio de diagnosticar do que a ausência do parâmetro.
     *
     * Então: por padrão não enviamos nada e valem os escopos do cadastro.
     * Quando o credenciamento sair com os nomes certos, `AIQFOME_SCOPE`
     * assume, sem precisar de deploy de código.
     */
    if (this.options.scope) url.searchParams.set('scope', this.options.scope);

    return url.toString();
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
