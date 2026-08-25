import { ExternalServiceError } from '@/core';

/**
 * Autorização do iFood no modelo **distribuído** (software house).
 *
 * Confirmado contra o ambiente real: o aplicativo distribuído recusa
 * `client_credentials` com "Unsupported grant type", porque quem autoriza é
 * cada lojista, não o parceiro. O caminho tem três passos:
 *
 *   1. o app pede um `userCode` — um código curto, válido por ~10 minutos;
 *   2. o lojista digita esse código no Portal do Parceiro e recebe de volta um
 *      `authorizationCode`;
 *   3. o app troca esse código, junto com o `verifier` do passo 1, por
 *      `accessToken` e `refreshToken`.
 *
 * Renovar pelo `refreshToken` é parte do funcionamento normal, não caso de
 * exceção — um turno de sábado atravessa a validade do token. Sobre qual é essa
 * validade, veja `expiryOf`: o `expiresIn` da resposta não é confiável.
 *
 * Os nomes dos campos são os do iFood (camelCase), que não seguem o RFC 6749.
 */
const DEFAULT_BASE_URL = 'https://merchant-api.ifood.com.br';

/**
 * Quando o token de fato morre.
 *
 * O iFood responde `expiresIn: 21600` — seis horas —, mas o `exp` de dentro do
 * próprio JWT vence três horas antes, e é o `exp` que o servidor faz valer. Um
 * token que pelo `expiresIn` ainda teria duas horas de vida responde
 * `401 {"message": "token expired"}`.
 *
 * Confiar no `expiresIn` fazia o worker parar sozinho no meio do expediente: a
 * renovação só era tentada perto do prazo declarado, quando o token real já
 * tinha morrido havia horas — e aí os pedidos simplesmente não entravam, sem
 * nada na tela que explicasse por quê.
 *
 * Entre os dois prazos vale o que vencer primeiro. Esticar a validade é o único
 * erro caro aqui: renovar cedo demais custa uma chamada, renovar tarde demais
 * custa pedidos.
 */
function expiryOf(accessToken: string, expiresIn: number): Date {
  const declarado = new Date(Date.now() + expiresIn * 1000);

  const corpo = accessToken.split('.')[1];
  if (!corpo) return declarado;

  try {
    const claims = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as {
      exp?: unknown;
    };

    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) return declarado;

    const real = new Date(claims.exp * 1000);
    return real < declarado ? real : declarado;
  } catch {
    // Token opaco ou corpo ilegível: o `expiresIn` é o que temos.
    return declarado;
  }
}

export interface IfoodUserCode {
  /** O que o lojista digita no portal. */
  userCode: string;
  /** Precisa sobreviver até o passo 3 — sem ele a troca não fecha. */
  authorizationCodeVerifier: string;
  verificationUrl: string;
  expiresInSeconds: number;
}

export interface IfoodTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

export class IfoodAuth {
  private readonly baseUrl: string;

  constructor(
    private readonly options: { clientId: string; clientSecret: string; baseUrl?: string },
  ) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  async requestUserCode(): Promise<IfoodUserCode> {
    const payload = await this.post<{
      userCode: string;
      authorizationCodeVerifier: string;
      verificationUrl: string;
      verificationUrlComplete?: string;
      expiresIn: number;
    }>('/authentication/v1.0/oauth/userCode', { clientId: this.options.clientId });

    return {
      userCode: payload.userCode,
      authorizationCodeVerifier: payload.authorizationCodeVerifier,
      // A versão "complete" já leva o código na query e poupa o lojista de
      // digitá-lo — é a que vale mostrar quando o iFood a devolve.
      verificationUrl: payload.verificationUrlComplete ?? payload.verificationUrl,
      expiresInSeconds: payload.expiresIn,
    };
  }

  async exchangeAuthorizationCode(input: {
    authorizationCode: string;
    authorizationCodeVerifier: string;
  }): Promise<IfoodTokens> {
    return this.token({
      grantType: 'authorization_code',
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
      authorizationCode: input.authorizationCode,
      authorizationCodeVerifier: input.authorizationCodeVerifier,
    });
  }

  async refresh(refreshToken: string): Promise<IfoodTokens> {
    return this.token({
      grantType: 'refresh_token',
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
      refreshToken,
    });
  }

  private async token(fields: Record<string, string>): Promise<IfoodTokens> {
    const payload = await this.post<{
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
    }>('/authentication/v1.0/oauth/token', fields);

    if (!payload.accessToken) {
      throw new ExternalServiceError('iFood', 'resposta de token sem accessToken');
    }

    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? null,
      expiresAt: expiryOf(payload.accessToken, payload.expiresIn),
    };
  }

  private async post<T>(path: string, fields: Record<string, string>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // O corpo do erro do iFood é específico e útil — foi ele que revelou o
      // "Unsupported grant type". Descartá-lo transformaria um diagnóstico de
      // trinta segundos numa tarde de tentativa e erro.
      const detail = await response.text().catch(() => '');
      throw new ExternalServiceError(
        'iFood',
        `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`,
      );
    }

    return (await response.json()) as T;
  }
}
