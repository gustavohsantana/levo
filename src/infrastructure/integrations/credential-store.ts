import type { LevoPrismaClient } from '../persistence/prisma/client';
import { decryptToken, encryptToken } from '../security/token-cipher';
import { ConfigurationError } from '@/core';

/**
 * Credenciais de marketplace por estabelecimento: guardar, renovar e entregar
 * um token válido.
 *
 * A renovação vive aqui, e não em cada adapter, porque é a mesma história nos
 * dois marketplaces: token curto, refresh token longo, e a obrigação de nunca
 * gravar nenhum dos dois em claro. Ligar um terceiro marketplace amanhã custa
 * um `provider` a mais, não uma segunda implementação disto.
 */
export type Provider = 'IFOOD' | 'AIQFOME';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  merchantId?: string | null;
  scope?: string | null;
}

/**
 * Margem para renovar antes de expirar.
 *
 * O ciclo do worker é de 30s e uma rodada de importação pode levar alguns
 * segundos. Renovar só ao expirar deixaria requisições em voo com um token que
 * vence no meio do caminho — e o sintoma seria um 401 intermitente, do tipo que
 * some quando você vai investigar.
 */
const RENEW_MARGIN_MS = 5 * 60 * 1000;

export class CredentialStore {
  constructor(
    private readonly prisma: LevoPrismaClient,
    private readonly secret: string,
  ) {}

  async save(establishmentId: string, provider: Provider, tokens: StoredTokens): Promise<void> {
    const data = {
      accessToken: encryptToken(tokens.accessToken, this.secret),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken, this.secret) : null,
      expiresAt: tokens.expiresAt,
      merchantId: tokens.merchantId ?? null,
      scope: tokens.scope ?? null,
    };

    await this.prisma.integrationCredential.upsert({
      where: { establishmentId_provider: { establishmentId, provider } },
      create: { establishmentId, provider, ...data },
      update: data,
    });
  }

  async read(establishmentId: string, provider: Provider): Promise<StoredTokens | null> {
    const row = await this.prisma.integrationCredential.findUnique({
      where: { establishmentId_provider: { establishmentId, provider } },
    });

    if (!row) return null;

    try {
      return {
        accessToken: decryptToken(row.accessToken, this.secret),
        refreshToken: row.refreshToken ? decryptToken(row.refreshToken, this.secret) : null,
        expiresAt: row.expiresAt,
        merchantId: row.merchantId,
        scope: row.scope,
      };
    } catch {
      /*
       * "Unsupported state or unable to authenticate data" é o que o AES-GCM
       * diz quando a chave não abre o que foi fechado — e não menciona chave,
       * credencial nem AUTH_SECRET. Aparecendo a cada 30 segundos no log do
       * worker, manda quem investiga procurar no lugar errado.
       *
       * A causa é sempre a mesma: o AUTH_SECRET mudou, ou difere entre os
       * ambientes que leem esta credencial. A saída é reconectar a plataforma.
       */
      throw new ConfigurationError(
        `${provider}: credencial ilegível — o AUTH_SECRET mudou ou difere entre ambientes. ` +
          'Reconecte a plataforma em Integrações.',
        { establishmentId, provider },
      );
    }
  }

  /**
   * Devolve um token válido, renovando se estiver perto de vencer.
   *
   * `renew` recebe o refresh token e devolve tokens novos. Fica de fora daqui
   * de propósito: cada marketplace tem o seu endpoint, mas a regra de quando
   * renovar é a mesma.
   */
  async accessTokenFor(
    establishmentId: string,
    provider: Provider,
    renew: (refreshToken: string) => Promise<StoredTokens>,
  ): Promise<string> {
    const current = await this.read(establishmentId, provider);

    if (!current) {
      throw new ConfigurationError(
        `${provider}: estabelecimento sem autorização. O lojista precisa autorizar o acesso.`,
        { establishmentId, provider },
      );
    }

    if (!this.isExpiring(current.expiresAt)) return current.accessToken;

    if (!current.refreshToken) {
      throw new ConfigurationError(
        `${provider}: token vencido e sem refresh token. É preciso autorizar de novo.`,
        { establishmentId, provider },
      );
    }

    const renewed = await renew(current.refreshToken);

    await this.save(establishmentId, provider, {
      ...renewed,
      // Nem toda renovação devolve um refresh token novo; quando não devolve, o
      // anterior continua valendo. Sobrescrever com null aqui seria condenar o
      // estabelecimento a reautorizar na próxima expiração.
      refreshToken: renewed.refreshToken ?? current.refreshToken,
      merchantId: renewed.merchantId ?? current.merchantId,
      scope: renewed.scope ?? current.scope,
    });

    return renewed.accessToken;
  }

  private isExpiring(expiresAt: Date | null): boolean {
    // Sem validade declarada, trata como válido: renovar às cegas gastaria o
    // refresh token a cada chamada.
    if (!expiresAt) return false;
    return expiresAt.getTime() - Date.now() <= RENEW_MARGIN_MS;
  }
}
