import { ExternalServiceError } from '@/core';

/**
 * Autenticação do aiqfome, contra o ID Magalu.
 *
 * **`clientCredentials` está verificado contra o ambiente real**; o par
 * authorize/exchange abaixo não. A credencial de parceiro emite token sozinha,
 * sem consentimento de lojista — modelo centralizado:
 *
 *     POST /oauth/token  grant_type=client_credentials   → 200
 *     aud     https://aiqfome.com
 *     scope   aqf:menu:read aqf:order:create aqf:order:read aqf:store:read
 *     validade 7200 s, sem refresh_token
 *
 * Sem `refresh_token` na resposta: quando o token vence, pede-se outro. Não é
 * omissão da plataforma, é o que o modelo implica — não há sessão de usuário
 * para renovar.
 *
 * O `authorization_code` continua aqui porque o IdP o anuncia em
 * `grant_types_supported` e um dia pode ser o caminho para vincular loja a
 * loja. Enquanto o credenciamento não disser que é assim, **não é o caminho
 * principal** — quem importa pedido usa `clientCredentials`.
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

  /**
   * Token de parceiro, sem lojista no meio.
   *
   * Os escopos não vão no pedido: vêm do cadastro do aplicativo, e o IdP os
   * devolve na resposta. Mandar um palpite aqui só estreitaria o que já foi
   * concedido.
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
