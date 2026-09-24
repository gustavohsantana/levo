import type { Geocoder, Logger } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { PrismaUnitOfWork } from '@/infrastructure/persistence/prisma/unit-of-work';
import { createLogger } from '@/infrastructure/observability/logger';
import { CachedGeocoder } from './cached-geocoder';
import { CascataGeocoder } from './cascata-geocoder';
import { IbgeGeocoder } from './ibge-geocoder';
import { NominatimGeocoder } from './nominatim-geocoder';

/**
 * O geocodificador que o produto usa de verdade.
 *
 * IBGE primeiro, Nominatim depois. A base do IBGE tem as ruas do interior que
 * faltam no OpenStreetMap — quando a cidade foi carregada, ela responde e nem
 * chega ao Nominatim. Não achou, o `null` passa a vez. O cache por cima vale
 * para os dois, e abre a própria transação: geocodificar é rede, e segurar a
 * transação do pedido esperando terceiro responder esgota o pool.
 *
 * Nasceu no composition root e saiu para cá porque o WhatsApp também precisa
 * achar um endereço — e a infraestrutura não pode pedir isso à tela do
 * cardápio.
 */
export function criarGeocoder(establishmentId: string, logger?: Logger): Geocoder {
  const config = env();
  const log = logger ?? createLogger(config.LOG_LEVEL, !config.isProduction);
  const prisma = getPrismaClient(config.DATABASE_URL);
  const uow = new PrismaUnitOfWork(prisma, establishmentId);

  return new CachedGeocoder(
    new CascataGeocoder(
      [
        new IbgeGeocoder(prisma, log),
        new NominatimGeocoder({
          baseUrl: config.GEOCODER_BASE_URL,
          apiKey: config.GEOCODER_API_KEY || undefined,
          userAgent: config.GEOCODER_USER_AGENT,
          logger: log,
        }),
      ],
      log,
    ),
    {
      get: (key) => uow.run((repos) => repos.geocodeCache.get(key)),
      set: (key, coords) => uow.run((repos) => repos.geocodeCache.set(key, coords)),
    },
    log,
  );
}
