import { env } from './env';
import { getPrismaClient } from './infrastructure/persistence/prisma/client';
import { PrismaUnitOfWork } from './infrastructure/persistence/prisma/unit-of-work';
import { CachedGeocoder } from './infrastructure/geocoding/cached-geocoder';
import { NominatimGeocoder } from './infrastructure/geocoding/nominatim-geocoder';
import { OsrmRoutingService } from './infrastructure/routing/osrm-routing-service';
import { TwoOptOptimizer } from './infrastructure/routing/two-opt-optimizer';
import { WhatsAppLinkBuilder } from './infrastructure/messaging/whatsapp-link-builder';
import { createLogger } from './infrastructure/observability/logger';
import { systemClock, uuidGenerator } from './infrastructure/system';
import { CreateOrder } from './application/use-cases/orders/create-order';
import { GeocodeOrder } from './application/use-cases/orders/geocode-order';
import { ImportOrderFromSource } from './application/use-cases/orders/import-order-from-source';
import { PlanRoute } from './application/use-cases/routes/plan-route';
import { StartRoute } from './application/use-cases/routes/start-route';
import { AdvanceOrderStage } from '@/application/use-cases/orders/advance-order-stage';
import { SaveProduct } from '@/application/use-cases/catalog/save-product';
import { SetProductActive } from '@/application/use-cases/catalog/set-product-active';
import { RemoveProduct } from '@/application/use-cases/catalog/remove-product';
import { CompleteStop } from './application/use-cases/routes/complete-stop';
import { RecordCourierPing } from './application/use-cases/routes/record-courier-ping';
import { GetTrackingSnapshot } from './application/use-cases/tracking/get-tracking-snapshot';
import type { Geocoder, Repositories, UnitOfWork } from './core';

/**
 * Onde as peças concretas se encontram — e o **único** lugar do sistema que
 * conhece as duas pontas ao mesmo tempo.
 *
 * Fábricas simples, injeção por construtor. Sem container de injeção de
 * dependência: com esta quantidade de peças, um container só acrescentaria
 * mágica e uma pilha de erro ilegível. Trocar de geocodificador, de banco ou de
 * roteirizador é mudar uma linha aqui — nada em `application/` ou `core/` sabe
 * quem venceu.
 */
export interface Container {
  uow: UnitOfWork;
  geocoder: Geocoder;
  whatsapp: WhatsAppLinkBuilder;
  read: <T>(work: (repos: Repositories) => Promise<T>) => Promise<T>;
  useCases: {
    createOrder: CreateOrder;
    geocodeOrder: GeocodeOrder;
    importOrders: ImportOrderFromSource;
    planRoute: PlanRoute;
    startRoute: StartRoute;
    completeStop: CompleteStop;
    recordPing: RecordCourierPing;
    tracking: GetTrackingSnapshot;
    saveProduct: SaveProduct;
    setProductActive: SetProductActive;
    removeProduct: RemoveProduct;
    advanceOrderStage: AdvanceOrderStage;
  };
}

const containers = new Map<string, Container>();

export function containerFor(establishmentId: string): Container {
  const cached = containers.get(establishmentId);
  if (cached) return cached;

  const config = env();
  const logger = createLogger(config.LOG_LEVEL, !config.isProduction);

  const prisma = getPrismaClient(config.DATABASE_URL);
  const uow = new PrismaUnitOfWork(prisma, establishmentId);

  // O cache precisa da própria transação, então o decorator recebe um
  // repositório que abre a sua. Geocodificar é chamada de rede: manter isso
  // fora da transação do caso de uso é o que evita segurar conexão do pool
  // esperando terceiro responder.
  const geocoder = new CachedGeocoder(
    new NominatimGeocoder({
      baseUrl: config.GEOCODER_BASE_URL,
      apiKey: config.GEOCODER_API_KEY || undefined,
      userAgent: config.GEOCODER_USER_AGENT,
      logger,
    }),
    {
      get: (key) => uow.run((repos) => repos.geocodeCache.get(key)),
      set: (key, coords) => uow.run((repos) => repos.geocodeCache.set(key, coords)),
    },
    logger,
  );

  const routing = new OsrmRoutingService({ baseUrl: config.OSRM_BASE_URL, logger });
  const optimizer = new TwoOptOptimizer();
  const ids = uuidGenerator;
  const clock = systemClock;

  const container: Container = {
    uow,
    geocoder,
    whatsapp: new WhatsAppLinkBuilder(config.PUBLIC_BASE_URL),
    read: (work) => uow.run(work),
    useCases: {
      createOrder: new CreateOrder(uow, geocoder, ids, clock, establishmentId),
      geocodeOrder: new GeocodeOrder(uow, geocoder, clock),
      importOrders: new ImportOrderFromSource(uow, geocoder, ids, clock, establishmentId, logger),
      planRoute: new PlanRoute(uow, routing, optimizer, ids, clock),
      startRoute: new StartRoute(uow, clock),
      completeStop: new CompleteStop(uow, clock),
      recordPing: new RecordCourierPing(uow, clock),
      saveProduct: new SaveProduct(uow, ids, establishmentId),
      setProductActive: new SetProductActive(uow),
      removeProduct: new RemoveProduct(uow),
      advanceOrderStage: new AdvanceOrderStage(uow, clock),
      tracking: new GetTrackingSnapshot(uow, clock),
    },
  };

  containers.set(establishmentId, container);
  return container;
}
