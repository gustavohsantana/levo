import 'dotenv/config';
import { containerFor } from '../src/composition-root';
import { env } from '../src/env';
import { createLogger } from '../src/infrastructure/observability/logger';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
import { IfoodOrderSource } from '../src/infrastructure/integrations/ifood/adapter';
import { IfoodAuth } from '../src/infrastructure/integrations/ifood/auth';
import {
  CredentialStore,
  type Provider,
} from '../src/infrastructure/integrations/credential-store';
import { AiqfomeOrderSource } from '../src/infrastructure/integrations/aiqfome/adapter';
import { aiqfomeAccessTokenFor } from '../src/infrastructure/integrations/aiqfome/factory';
import type { MarketplaceCommands, OrderSource } from '../src/core';

/**
 * Worker de importação de pedidos.
 *
 * ### Por que isto é um processo separado do Next.js
 *
 * O iFood exige polling **a cada 30 segundos**. O cron da Vercel tem
 * granularidade mínima de 1 minuto — então o poller não pode viver dentro do
 * aplicativo. Precisa de um processo contínuo.
 *
 * E é exatamente aqui que a arquitetura se paga: este arquivo importa o mesmo
 * `ImportOrderFromSource` que o webhook usa. Mesma regra de negócio, mesma
 * idempotência, dois runtimes, zero duplicação. Sem a separação de camadas,
 * essa regra estaria dentro de um route handler e teria que ser copiada.
 *
 *   npm run worker
 */

const POLL_INTERVAL_MS = 30_000;
/** Retenção do trajeto do motoboy: LGPD e escala com a mesma medida. */
const PING_RETENTION_DAYS = 7;

const config = env();
const logger = createLogger(config.LOG_LEVEL, !config.isProduction);

/**
 * Monta as origens de um estabelecimento sem deixar uma derrubar a outra.
 *
 * Uma credencial ilegível estourava dentro de `sourcesFor`, que roda **fora**
 * do try/catch por origem — então o erro subia e abortava o ciclo inteiro. Na
 * prática: o aiqfome com credencial quebrada calou o polling do iFood, que
 * estava perfeito, e o iFood passou a ver o aplicativo como OFFLINE. Custou uma
 * homologação.
 *
 * Isolar aqui é barato e a falha vira o que ela é: uma plataforma de fora nesta
 * rodada, com o motivo no log, e o resto trabalhando.
 */
async function sourcesFor(establishmentId: string): Promise<OrderSource[]> {
  const sources: OrderSource[] = [];

  for (const montar of [ifoodSourceFor, aiqfomeSourceFor]) {
    try {
      const source = await montar(establishmentId);
      if (source) sources.push(source);
    } catch (cause) {
      logger.error({ establishmentId, cause: String(cause) }, 'worker.origem_indisponivel');
    }
  }

  return sources;
}

async function ifoodSourceFor(establishmentId: string): Promise<OrderSource | null> {
  if (!config.ifoodEnabled) return null;

  {
    if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) {
      logger.error({ establishmentId }, 'ifood.credenciais_ausentes');
    } else {
      const auth = new IfoodAuth({
        clientId: config.IFOOD_CLIENT_ID,
        clientSecret: config.IFOOD_CLIENT_SECRET,
      });
      const store = new CredentialStore(getPrismaClient(config.DATABASE_URL), config.AUTH_SECRET);

      /*
       * A credencial é do lojista, não do parceiro: quem não autorizou fica de
       * fora desta rodada, com o motivo no log, sem derrubar os outros
       * estabelecimentos que estão funcionando.
       */
      const credential = await store.read(establishmentId, 'IFOOD');

      if (!credential) {
        logger.warn({ establishmentId }, 'ifood.sem_autorizacao');
      } else if (!credential.merchantId) {
        logger.warn({ establishmentId }, 'ifood.sem_loja_vinculada');
      } else {
        return new IfoodOrderSource({
          merchantId: credential.merchantId,
          accessToken: () =>
            store.accessTokenFor(establishmentId, 'IFOOD', (refreshToken) =>
              auth.refresh(refreshToken),
            ),
          logger,
        });
      }
    }
  }

  return null;
}

async function aiqfomeSourceFor(establishmentId: string): Promise<OrderSource | null> {
  if (!config.aiqfomeEnabled) return null;

  {
    /*
     * A credencial é da loja, não do parceiro: cada lojista autoriza o
     * aplicativo na loja dele e o token sai do `CredentialStore`. Sem
     * consentimento não há o que buscar — e isso não é erro, é uma loja que
     * ainda não conectou.
     */
    const store = new CredentialStore(getPrismaClient(config.DATABASE_URL), config.AUTH_SECRET);
    const credencial = await store.read(establishmentId, 'AIQFOME');

    if (!credencial) {
      logger.warn({ establishmentId }, 'aiqfome.sem_consentimento');
    } else if (!credencial.merchantId) {
      logger.error({ establishmentId }, 'aiqfome.loja_nao_escolhida');
    } else {
      return new AiqfomeOrderSource({
        accessToken: aiqfomeAccessTokenFor(store, establishmentId),
        storeId: credencial.merchantId,
        baseUrl: config.AIQFOME_BASE_URL,
        logger,
      });
    }
  }

  return null;
}

/**
 * Quem sabe falar de volta com a plataforma, para um estabelecimento.
 *
 * Devolve `null` quando não há credencial: um estabelecimento que nunca
 * conectou não tem para quem avisar, e isso não é falha.
 */
async function commandsFor(
  establishmentId: string,
  provider: Provider,
): Promise<MarketplaceCommands | null> {
  /*
   * Mercado Pago compartilha a tabela de credenciais com os marketplaces, mas
   * não é um: ele não traz pedido para dentro, então não existe status para
   * mandar de volta. `null` aqui faz o aviso ser marcado como resolvido em vez
   * de ficar numa fila que nunca esvazia.
   */
  if (provider === 'MERCADO_PAGO') return null;

  const store = new CredentialStore(getPrismaClient(config.DATABASE_URL), config.AUTH_SECRET);
  const credencial = await store.read(establishmentId, provider);
  if (!credencial?.merchantId) return null;

  if (provider === 'IFOOD') {
    if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) return null;

    const auth = new IfoodAuth({
      clientId: config.IFOOD_CLIENT_ID,
      clientSecret: config.IFOOD_CLIENT_SECRET,
    });

    return new IfoodOrderSource({
      merchantId: credencial.merchantId,
      accessToken: () =>
        store.accessTokenFor(establishmentId, 'IFOOD', (rt) => auth.refresh(rt)),
      logger,
    });
  }

  if (!config.AIQFOME_CLIENT_ID || !config.AIQFOME_CLIENT_SECRET) return null;

  return new AiqfomeOrderSource({
    accessToken: aiqfomeAccessTokenFor(store, establishmentId),
    storeId: credencial.merchantId,
    baseUrl: config.AIQFOME_BASE_URL,
    logger,
  });
}

/** Quantas vezes insistir antes de desistir de um aviso. */
const MAX_TENTATIVAS = 5;

/**
 * Esvazia a caixa de saída dos avisos ao marketplace.
 *
 * Cada aviso é independente: um que falha não impede os outros. E falhar não
 * perde nada — a linha continua pendente e volta no próximo ciclo, com o erro
 * registrado para quem for investigar.
 *
 * Depois de `MAX_TENTATIVAS`, para de tentar. Insistir para sempre num aviso
 * que a plataforma rejeita por regra de negócio — pedido já cancelado, por
 * exemplo — só gasta chamada e enche o log, escondendo os erros que importam.
 */
async function drenarAvisos(): Promise<void> {
  const prisma = getPrismaClient(config.DATABASE_URL);

  const pendentes = await prisma.marketplaceCommand.findMany({
    where: { processedAt: null, attempts: { lt: MAX_TENTATIVAS } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  for (const aviso of pendentes) {
    try {
      const commands = await commandsFor(aviso.establishmentId, aviso.provider);
      const executar = {
        CONFIRM: commands?.confirm,
        READY: commands?.markReady,
        DISPATCH: commands?.dispatch,
        DELIVERED: commands?.markDelivered,
      }[aviso.command];

      /*
       * Plataforma sem comando equivalente não é pendência: o iFood conclui o
       * pedido sozinho depois do dispatch, o aiqfome não despacha. Marcar como
       * resolvido evita uma fila que nunca esvazia.
       */
      if (!commands || !executar) {
        await prisma.marketplaceCommand.update({
          where: { id: aviso.id },
          data: { processedAt: new Date(), lastError: 'sem comando equivalente na plataforma' },
        });
        continue;
      }

      await executar.call(commands, aviso.externalOrderId);

      await prisma.marketplaceCommand.update({
        where: { id: aviso.id },
        data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });

      logger.info(
        { provider: aviso.provider, command: aviso.command, orderId: aviso.externalOrderId },
        'marketplace.aviso_entregue',
      );
    } catch (cause) {
      await prisma.marketplaceCommand.update({
        where: { id: aviso.id },
        data: { attempts: { increment: 1 }, lastError: String(cause).slice(0, 500) },
      });

      logger.error(
        {
          provider: aviso.provider,
          command: aviso.command,
          orderId: aviso.externalOrderId,
          tentativa: aviso.attempts + 1,
          cause: String(cause),
        },
        'marketplace.aviso_falhou',
      );
    }
  }
}

/**
 * Quanto esperar antes de perguntar ao gateway sobre um pagamento pendente.
 *
 * Curto demais e conversamos com o Mercado Pago sobre cobrança que o cliente
 * ainda está lendo no aplicativo do banco. Dois minutos deixam o webhook fazer
 * o trabalho no caso comum — ele chega em segundos — e a reconciliação cobre o
 * que ele não cobre.
 */
const RECONCILIAR_APOS_MS = 2 * 60_000;

/** Teto por rodada. Fila grande se resolve em ciclos, não numa avalanche. */
const RECONCILIAR_POR_CICLO = 20;

/**
 * Pergunta ao gateway o que aconteceu com os pagamentos pendentes.
 *
 * O webhook é otimização, não garantia. Cobrança de Pix que expira sem ser paga
 * não gera notificação confiável — e, sem isto, o pagamento fica PENDING para
 * sempre e o pedido trava em "aguardando pagamento" na tela do cliente. Com Pix
 * isso é a maioria dos casos, porque carrinho abandonado é a regra, não a
 * exceção.
 *
 * Quem sabe decidir é o `ConfirmPayment`: ele relê o status no gateway, confere
 * o valor e marca pago ou expirado. Aqui só existe quem o chame sem depender de
 * o webhook ter chegado.
 */
async function reconciliarPagamentos(establishmentId: string): Promise<void> {
  const container = containerFor(establishmentId);
  const antesDe = new Date(Date.now() - RECONCILIAR_APOS_MS);

  const pendentes = await container.read((repos) =>
    repos.payments.listPendingOlderThan(antesDe, RECONCILIAR_POR_CICLO),
  );

  for (const pagamento of pendentes) {
    try {
      const resultado = await container.useCases.confirmPayment.execute({
        externalId: pagamento.externalId,
      });

      // Só registra quando saiu de pendente: um log por pagamento a cada 30
      // segundos afogaria os erros que importam.
      if (resultado !== 'PENDING') {
        logger.info(
          { establishmentId, paymentId: pagamento.id, orderId: pagamento.orderId, resultado },
          'pagamento.reconciliado',
        );
      }
    } catch (cause) {
      logger.error(
        { establishmentId, paymentId: pagamento.id, cause: String(cause) },
        'pagamento.reconciliacao_falhou',
      );
    }
  }
}

async function tick(): Promise<void> {
  const prisma = getPrismaClient(config.DATABASE_URL);
  const establishments = await prisma.establishment.findMany({ select: { id: true } });

  for (const establishment of establishments) {
    const sources = await sourcesFor(establishment.id);
    const container = containerFor(establishment.id);

    for (const source of sources) {
      try {
        const result = await container.useCases.importOrders.execute(source);
        if (result.imported > 0 || result.failed > 0 || result.updated > 0) {
          logger.info({ establishmentId: establishment.id, source: source.kind, ...result }, 'import.ciclo');
        }
      } catch (cause) {
        // Plataforma fora do ar não pode derrubar o worker: o próximo ciclo
        // tenta de novo em 30s, e nenhum pedido é perdido porque só sai ack do
        // que entrou.
        logger.error(
          { establishmentId: establishment.id, source: source.kind, cause: String(cause) },
          'import.ciclo_falhou',
        );
      }
    }
  }

  // Depois de importar: o que entrou nesta rodada pode ter gerado aviso.
  await drenarAvisos();

  /*
   * Isolado por estabelecimento: gateway fora do ar numa loja não pode impedir
   * a reconciliação das outras.
   */
  for (const establishment of establishments) {
    try {
      await reconciliarPagamentos(establishment.id);
    } catch (cause) {
      logger.error(
        { establishmentId: establishment.id, cause: String(cause) },
        'pagamento.reconciliacao_falhou',
      );
    }
  }
}

/** Roda uma vez por dia, junto com um dos ciclos. */
async function purgeOldPings(): Promise<void> {
  const prisma = getPrismaClient(config.DATABASE_URL);
  const cutoff = new Date(Date.now() - PING_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const { count } = await prisma.courierPing.deleteMany({
    where: { recordedAt: { lt: cutoff }, route: { status: 'FINISHED' } },
  });

  if (count > 0) logger.info({ removidos: count, cutoff }, 'pings.purgados');
}

async function main(): Promise<void> {
  logger.info(
    { intervalo: POLL_INTERVAL_MS, ifood: config.ifoodEnabled, aiqfome: config.aiqfomeEnabled },
    'worker.iniciado',
  );

  if (!config.ifoodEnabled && !config.aiqfomeEnabled) {
    logger.warn(
      {},
      'Nenhuma integração ligada. O worker segue rodando só para a limpeza de trajetos; ' +
        'pedidos entram pelo painel ou pelo webhook.',
    );
  }

  let running = true;
  const stop = () => {
    running = false;
    logger.info({}, 'worker.encerrando');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  let lastPurge = 0;

  while (running) {
    const started = Date.now();

    await tick().catch((cause) => logger.error({ cause: String(cause) }, 'worker.tick_falhou'));

    if (started - lastPurge > 24 * 60 * 60 * 1000) {
      lastPurge = started;
      await purgeOldPings().catch((cause) =>
        logger.error({ cause: String(cause) }, 'pings.purga_falhou'),
      );
    }

    // Desconta o tempo gasto no ciclo: o intervalo é entre INÍCIOS, senão um
    // ciclo lento empurra o próximo e a janela de 30s do iFood escapa.
    const elapsed = Date.now() - started;
    await sleep(Math.max(1_000, POLL_INTERVAL_MS - elapsed));
  }

  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main();
