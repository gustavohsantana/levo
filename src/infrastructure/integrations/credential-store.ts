import type { LevoPrismaClient } from "../persistence/prisma/client";

/** O cliente do Prisma ou o da transação — os dois servem para ler e gravar. */
type PrismaLike = Pick<LevoPrismaClient, "integrationCredential">;
import { decryptToken, encryptToken } from "../security/token-cipher";
import { ConfigurationError } from "@/core";

/**
 * Credenciais de marketplace por estabelecimento: guardar, renovar e entregar
 * um token válido.
 *
 * A renovação vive aqui, e não em cada adapter, porque é a mesma história nos
 * dois marketplaces: token curto, refresh token longo, e a obrigação de nunca
 * gravar nenhum dos dois em claro. Ligar um terceiro marketplace amanhã custa
 * um `provider` a mais, não uma segunda implementação disto.
 */
export type Provider = "IFOOD" | "AIQFOME" | "FOOD99" | "MERCADO_PAGO" | "WHATSAPP";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  merchantId?: string | null;
  scope?: string | null;
  /** Só o Mercado Pago tem. Em claro: ela nasce para ir ao navegador. */
  publicKey?: string | null;
  /** `null` nos provedores que não distinguem teste de produção. */
  liveMode?: boolean | null;
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

  /**
   * `cliente` existe para a renovação poder gravar DENTRO da transação que
   * segura a trava. Gravar pela conexão de fora sairia do escopo do lock — a
   * escrita não seria protegida por ele nem desfeita se a transação abortasse,
   * que é justamente o buraco que a trava existe para fechar.
   */
  async save(
    establishmentId: string,
    provider: Provider,
    tokens: StoredTokens,
    cliente: PrismaLike = this.prisma,
  ): Promise<void> {
    const data = {
      accessToken: encryptToken(tokens.accessToken, this.secret),
      refreshToken: tokens.refreshToken
        ? encryptToken(tokens.refreshToken, this.secret)
        : null,
      expiresAt: tokens.expiresAt,
      merchantId: tokens.merchantId ?? null,
      scope: tokens.scope ?? null,
      publicKey: tokens.publicKey ?? null,
      liveMode: tokens.liveMode ?? null,
    };

    await cliente.integrationCredential.upsert({
      where: { establishmentId_provider: { establishmentId, provider } },
      create: { establishmentId, provider, ...data },
      update: data,
    });
  }

  async read(
    establishmentId: string,
    provider: Provider,
    cliente: PrismaLike = this.prisma,
  ): Promise<StoredTokens | null> {
    const row = await cliente.integrationCredential.findUnique({
      where: { establishmentId_provider: { establishmentId, provider } },
    });

    if (!row) return null;

    try {
      return {
        accessToken: decryptToken(row.accessToken, this.secret),
        refreshToken: row.refreshToken
          ? decryptToken(row.refreshToken, this.secret)
          : null,
        expiresAt: row.expiresAt,
        merchantId: row.merchantId,
        scope: row.scope,
        publicKey: row.publicKey,
        liveMode: row.liveMode,
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
          "Reconecte a plataforma em Integrações.",
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
    // Caminho comum: token válido, nenhuma trava, nenhuma transação. Renovar é
    // raro — uma vez a cada duas horas por estabelecimento.
    const atual = await this.read(establishmentId, provider);

    if (!atual) {
      throw new ConfigurationError(
        `${provider}: estabelecimento sem autorização. O lojista precisa autorizar o acesso.`,
        { establishmentId, provider },
      );
    }

    if (!this.isExpiring(atual.expiresAt)) return atual.accessToken;

    return this.renovarComExclusividade(establishmentId, provider, renew);
  }

  /**
   * ⭐ Renova com UM chamador por vez, garantido pelo banco.
   *
   * O aiqfome — e OAuth em geral — usa refresh token rotativo: cada renovação
   * emite um novo e mata o anterior. Isso transforma duas renovações
   * simultâneas em perda permanente de acesso, e não em simples desperdício:
   *
   *     A lê R1              B lê R1
   *     A renova → R2
   *                          B renova → R3   (o provedor rotacionou de novo)
   *     A grava R2 ← último a escrever vence, e R2 já está morto
   *
   * A partir daí toda renovação responde `invalid_grant` e só o lojista
   * consegue consertar, reautorizando no portal. Aconteceu de verdade: dois
   * workers na mesma loja mataram o token do aiqfome em 31/08.
   *
   * Guardar a escrita não bastaria. O estrago acontece na CHAMADA duplicada,
   * antes de qualquer gravação — escolher qual resposta guardar não desfaz a
   * rotação que o provedor já executou. Por isso a exclusão precisa envolver a
   * renovação inteira, não só o `update`.
   *
   * `FOR UPDATE` trava a linha da credencial: o segundo processo espera, e
   * quando entra encontra o token que o primeiro acabou de gravar — e nem
   * chega a chamar o provedor.
   *
   * Sim, isto segura uma conexão do pool durante uma chamada de rede, coisa
   * que este código evita em todo lugar (ver o geocodificador). A diferença é
   * a frequência e o preço do erro: geocodificar é por pedido e falhar custa
   * um endereço; renovar é de duas em duas horas e falhar custa a integração
   * inteira até alguém perceber. O `lock_timeout` limita a espera.
   */
  private async renovarComExclusividade(
    establishmentId: string,
    provider: Provider,
    renew: (refreshToken: string) => Promise<StoredTokens>,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Sem teto, um provedor lento faria a fila inteira esperar por ele. Com
         * teto, quem não conseguir a trava falha rápido e tenta no próximo ciclo
         * — que é o comportamento certo para um worker que roda a cada 30s.
         */
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '15s'`);

        await tx.$queryRaw`
        SELECT id FROM "IntegrationCredential"
        WHERE "establishmentId" = ${establishmentId}
          AND "provider"::text = ${provider}
        FOR UPDATE
      `;

        /*
         * Releitura DENTRO da trava. É o ponto todo: quem esperou encontra aqui
         * o token que o outro renovou, e volta sem chamar o provedor.
         */
        const atual = await this.read(establishmentId, provider, tx);

        if (!atual) {
          throw new ConfigurationError(
            `${provider}: estabelecimento sem autorização. O lojista precisa autorizar o acesso.`,
            { establishmentId, provider },
          );
        }

        if (!this.isExpiring(atual.expiresAt)) return atual.accessToken;

        if (!atual.refreshToken) {
          throw new ConfigurationError(
            `${provider}: token vencido e sem refresh token. É preciso autorizar de novo.`,
            { establishmentId, provider },
          );
        }

        const renovado = await renew(atual.refreshToken);

        await this.save(
          establishmentId,
          provider,
          {
            ...renovado,
            // Nem toda renovação devolve um refresh token novo; quando não devolve,
            // o anterior continua valendo. Sobrescrever com null aqui seria
            // condenar o estabelecimento a reautorizar na próxima expiração.
            refreshToken: renovado.refreshToken ?? atual.refreshToken,
            merchantId: renovado.merchantId ?? atual.merchantId,
            scope: renovado.scope ?? atual.scope,
            publicKey: renovado.publicKey ?? atual.publicKey,
            liveMode: renovado.liveMode ?? atual.liveMode,
          },
          tx,
        );

        return renovado.accessToken;
      },
      /*
       * O padrão do Prisma é abortar a transação em 5s — menos que o próprio
       * `lock_timeout`, o que faria a espera pela trava morrer antes de ter
       * chance de servir para alguma coisa. O teto aqui precisa acomodar a
       * espera mais a chamada ao provedor.
       */
      { maxWait: 20_000, timeout: 40_000 },
    );
  }

  private isExpiring(expiresAt: Date | null): boolean {
    // Sem validade declarada, trata como válido: renovar às cegas gastaria o
    // refresh token a cada chamada.
    if (!expiresAt) return false;
    return expiresAt.getTime() - Date.now() <= RENEW_MARGIN_MS;
  }
}
