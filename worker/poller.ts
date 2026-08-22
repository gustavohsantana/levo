import 'dotenv/config';
import { containerFor } from '../src/composition-root';
import { env } from '../src/env';
import { createLogger } from '../src/infrastructure/observability/logger';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
import { IfoodOrderSource } from '../src/infrastructure/integrations/ifood/adapter';
import { AiqfomeOrderSource } from '../src/infrastructure/integrations/aiqfome/adapter';
import type { OrderSource } from '../src/core';

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

async function sourcesFor(establishmentId: string): Promise<OrderSource[]> {
  const sources: OrderSource[] = [];

  if (config.ifoodEnabled) {
    if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET || !config.IFOOD_MERCHANT_ID) {
      logger.error({ establishmentId }, 'ifood.credenciais_ausentes');
    } else {
      sources.push(
        new IfoodOrderSource({
          clientId: config.IFOOD_CLIENT_ID,
          clientSecret: config.IFOOD_CLIENT_SECRET,
          merchantId: config.IFOOD_MERCHANT_ID,
          logger,
        }),
      );
    }
  }

  if (config.aiqfomeEnabled) {
    if (!config.AIQFOME_API_KEY || !config.AIQFOME_MERCHANT_ID) {
      logger.error({ establishmentId }, 'aiqfome.credenciais_ausentes');
    } else {
      sources.push(
        new AiqfomeOrderSource({
          apiKey: config.AIQFOME_API_KEY,
          merchantId: config.AIQFOME_MERCHANT_ID,
          logger,
        }),
      );
    }
  }

  return sources;
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
        if (result.imported > 0 || result.failed > 0) {
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
