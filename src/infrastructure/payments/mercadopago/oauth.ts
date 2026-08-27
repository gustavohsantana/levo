import { ExternalServiceError } from '@/core';

/**
 * Consentimento do lojista no Mercado Pago.
 *
 * A diferença para o iFood e o aiqfome não é técnica, é de propósito: os dois
 * marketplaces autorizam o Levô a **ler pedidos**; aqui o lojista autoriza o
 * Levô a **criar cobrança na conta dele**. O dinheiro nunca passa pelo Levô —
 * cai direto no Mercado Pago do restaurante, com a taxa e o prazo que ele já
 * negociou lá.
 *
 * Consequência disso no código, e vale dizer em voz alta porque é uma decisão e
 * não um esquecimento: **nada aqui envia `application_fee`**. Esse é o campo que
 * transformaria o Levô em intermediador com comissão por venda, e o produto
 * cobra mensalidade. Não cobrar comissão é uma linha que não se escreve.
 */
export interface MercadoPagoOAuthOptions {
  clientId: string;
  clientSecret: string;
  /**
   * Precisa ser **idêntico** ao cadastrado em "Suas integrações", caractere a
   * caractere. O Mercado Pago compara por igualdade exata e recusa a troca do
   * código com uma mensagem que não menciona o redirect.
   */
  redirectUri: string;
  authorizationUrl?: string;
  tokenUrl?: string;
}

export interface MercadoPagoTokens {
  accessToken: string;
  refreshToken: string | null;
  scope: string | null;
  expiresAt: Date | null;
  /** Chave publicável da conta do lojista — usada no front quando entrar cartão. */
  publicKey: string | null;
  /** `user_id` do vendedor: quem recebe o dinheiro. */
  merchantId: string | null;
  /**
   * `false` quando a autorização foi feita com credencial de teste, `null`
   * quando a resposta não disse.
   *
   * A distinção entre `false` e `null` não é preciosismo — é o que impede uma
   * conta de produção de virar "conta de teste" sozinha. A renovação preserva o
   * que já estava guardado com `??`, e um `false` inventado aqui apagaria o
   * valor certo na primeira renovação cuja resposta viesse sem `live_mode`.
   * Quem escolhe o padrão seguro é o consentimento, que é onde ele significa
   * alguma coisa.
   */
  liveMode: boolean | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  public_key?: string;
  user_id?: number | string;
  live_mode?: boolean;
  scope?: string;
  expires_in?: number;
  token_type?: string;
}

const DEFAULT_AUTHORIZATION_URL = 'https://auth.mercadopago.com/authorization';
const DEFAULT_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

export class MercadoPagoOAuth {
  private readonly authorizationUrl: string;
  private readonly tokenUrl: string;

  constructor(private readonly options: MercadoPagoOAuthOptions) {
    this.authorizationUrl = options.authorizationUrl ?? DEFAULT_AUTHORIZATION_URL;
    this.tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL;
  }

  buildAuthorizationUrl(state: string): string {
    const url = new URL(this.authorizationUrl);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.options.clientId);
    url.searchParams.set('redirect_uri', this.options.redirectUri);
    url.searchParams.set('state', state);
    /*
     * `platform_id=mp` é exigido pela tela de autorização. Sem ele o lojista
     * chega numa página que não sabe qual produto está pedindo consentimento —
     * e o retorno vem sem código, sem erro que explique.
     */
    url.searchParams.set('platform_id', 'mp');

    return url.toString();
  }

  async exchangeCode(code: string): Promise<MercadoPagoTokens> {
    return this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.options.redirectUri,
    });
  }

  async refresh(refreshToken: string): Promise<MercadoPagoTokens> {
    return this.requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  /*
   * As credenciais vão no **corpo**, não em `Authorization: Basic`.
   *
   * É o contrário do que se faz com o aiqfome, e não é descuido: o endpoint do
   * Mercado Pago documenta `client_id` e `client_secret` como campos do corpo, e
   * responde `invalid_client` a quem manda no cabeçalho. Seguir o RFC aqui
   * quebra a integração.
   */
  private async requestToken(fields: Record<string, string>): Promise<MercadoPagoTokens> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        ...fields,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      // O corpo distingue segredo errado de código expirado. Sem ele, o suporte
      // vira adivinhação — e o erro mais comum aqui é `redirect_uri` divergindo
      // do cadastro por um caractere.
      const detail = await response.text().catch(() => '');
      throw new ExternalServiceError(
        'mercado pago',
        `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const payload = (await response.json()) as TokenResponse;

    if (!payload.access_token) {
      throw new ExternalServiceError('mercado pago', 'Resposta sem access_token');
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      publicKey: payload.public_key ?? null,
      merchantId: payload.user_id != null ? String(payload.user_id) : null,
      liveMode: typeof payload.live_mode === 'boolean' ? payload.live_mode : null,
      scope: payload.scope ?? null,
      expiresAt:
        typeof payload.expires_in === 'number'
          ? new Date(Date.now() + payload.expires_in * 1000)
          : null,
    };
  }
}
