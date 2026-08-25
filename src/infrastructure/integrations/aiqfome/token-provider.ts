import type { AiqfomeOAuth } from './oauth';

/**
 * Um token de parceiro reaproveitado entre ciclos.
 *
 * O aiqfome não emite `refresh_token` — quando o token vence, pede-se outro.
 * Isso torna a renovação trivial e o cache necessário: sem ele, o worker
 * pediria um token novo a cada 30 segundos, três mil pedidos por dia para
 * substituir um valor que dura duas horas.
 *
 * A credencial é do parceiro, não do lojista, então um provedor serve todos os
 * estabelecimentos. É o oposto do iFood, onde cada loja tem o seu — e é por
 * isso que este não passa pelo `CredentialStore`: não há o que guardar por
 * estabelecimento, nem token de lojista para cifrar.
 */
const RENEW_MARGIN_MS = 5 * 60 * 1000;

export class AiqfomeTokenProvider {
  private cached: { token: string; expiresAt: Date | null } | null = null;
  /*
   * Um pedido em voo é compartilhado por quem chegar durante ele. Sem isto,
   * dois estabelecimentos no mesmo tick disparam duas trocas simultâneas e a
   * segunda invalida o token da primeira em provedores que só mantêm um ativo.
   */
  private inFlight: Promise<string> | null = null;

  constructor(private readonly oauth: AiqfomeOAuth) {}

  async accessToken(): Promise<string> {
    if (this.cached && !this.isExpiring(this.cached.expiresAt)) return this.cached.token;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.fetchToken().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async fetchToken(): Promise<string> {
    const tokens = await this.oauth.clientCredentials();
    this.cached = { token: tokens.accessToken, expiresAt: tokens.expiresAt };
    return tokens.accessToken;
  }

  private isExpiring(expiresAt: Date | null): boolean {
    // Sem validade declarada não dá para saber quando renovar; usar uma vez só
    // e pedir outro na próxima é mais barato que errar o prazo.
    if (!expiresAt) return true;
    return expiresAt.getTime() - Date.now() <= RENEW_MARGIN_MS;
  }
}
