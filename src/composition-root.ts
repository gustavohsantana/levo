import { env } from './env';
import { getPrismaClient } from './infrastructure/persistence/prisma/client';
import { PrismaUnitOfWork } from './infrastructure/persistence/prisma/unit-of-work';
import { CachedGeocoder } from './infrastructure/geocoding/cached-geocoder';
import { NominatimGeocoder } from './infrastructure/geocoding/nominatim-geocoder';
import { IbgeGeocoder } from './infrastructure/geocoding/ibge-geocoder';
import { CascataGeocoder } from './infrastructure/geocoding/cascata-geocoder';
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
import { SaveCourier } from '@/application/use-cases/couriers/save-courier';
import { SetCourierActive } from '@/application/use-cases/couriers/set-courier-active';
import { AdvanceOrderStage } from '@/application/use-cases/orders/advance-order-stage';
import { CancelOrder } from '@/application/use-cases/orders/cancel-order';
import { SaveOptionGroup } from '@/application/use-cases/catalog/save-option-group';
import {
  ifoodMerchantFor,
  marketplaceCommandsFor,
} from '@/infrastructure/integrations/marketplace-factory';
import type { IfoodMerchant } from '@/infrastructure/integrations/ifood/merchant';
import { CreatePayment } from '@/application/use-cases/payments/create-payment';
import { ConfirmPayment } from '@/application/use-cases/payments/confirm-payment';
import { RenameCategory } from '@/application/use-cases/catalog/rename-category';
import { SaveProduct } from '@/application/use-cases/catalog/save-product';
import { ReorderCatalog } from '@/application/use-cases/catalog/reorder-catalog';
import { SaveCourierPay } from '@/application/use-cases/couriers/save-courier-pay';
import { ReplanFromHere } from '@/application/use-cases/routes/replan-from-here';
import { SetProductActive } from '@/application/use-cases/catalog/set-product-active';
import { RemoveProduct } from '@/application/use-cases/catalog/remove-product';
import { CompleteStop } from './application/use-cases/routes/complete-stop';
import { RecordCourierPing } from './application/use-cases/routes/record-courier-ping';
import { GetTrackingSnapshot } from './application/use-cases/tracking/get-tracking-snapshot';
import { CredentialStore } from './infrastructure/integrations/credential-store';
import { mercadoPagoAccessTokenFor } from './infrastructure/payments/mercadopago/factory';
import { mercadoPagoGateway } from './infrastructure/payments/mercadopago/gateway';
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
  /** Leitura de tela: sem transação, e por isso pode rodar em paralelo. */
  readOnly: <T>(work: (repos: Repositories) => Promise<T>) => Promise<T>;
  /** O módulo Merchant do iFood, ou `null` se a loja não conectou. */
  ifoodMerchant: () => Promise<{ merchant: IfoodMerchant; merchantId: string } | null>;
  useCases: {
    createOrder: CreateOrder;
    geocodeOrder: GeocodeOrder;
    importOrders: ImportOrderFromSource;
    planRoute: PlanRoute;
    startRoute: StartRoute;
    replanFromHere: ReplanFromHere;
    completeStop: CompleteStop;
    recordPing: RecordCourierPing;
    tracking: GetTrackingSnapshot;
    saveProduct: SaveProduct;
    saveCourierPay: SaveCourierPay;
    reorderCatalog: ReorderCatalog;
    setProductActive: SetProductActive;
    removeProduct: RemoveProduct;
    renameCategory: RenameCategory;
    advanceOrderStage: AdvanceOrderStage;
    cancelOrder: CancelOrder;
    saveOptionGroup: SaveOptionGroup;
    createPayment: CreatePayment;
    confirmPayment: ConfirmPayment;
    saveCourier: SaveCourier;
    setCourierActive: SetCourierActive;
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
    /*
     * IBGE primeiro, Nominatim depois.
     *
     * A base do IBGE tem as ruas do interior que faltam no OpenStreetMap — quando
     * a cidade foi carregada, ela responde e nem chega ao Nominatim. Não achou,
     * o `null` passa a vez. O cache por cima vale para os dois: o pino do cliente
     * e o acerto do IBGE ficam guardados juntos.
     */
    new CascataGeocoder(
      [
        new IbgeGeocoder(getPrismaClient(config.DATABASE_URL), logger),
        new NominatimGeocoder({
          baseUrl: config.GEOCODER_BASE_URL,
          apiKey: config.GEOCODER_API_KEY || undefined,
          userAgent: config.GEOCODER_USER_AGENT,
          logger,
        }),
      ],
      logger,
    ),
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
  const credentialStore = new CredentialStore(prisma, config.AUTH_SECRET);
  const mercadoPagoToken = mercadoPagoAccessTokenFor(credentialStore, establishmentId);

  const container: Container = {
    uow,
    geocoder,
    whatsapp: new WhatsAppLinkBuilder(config.PUBLIC_BASE_URL),
    read: (work) => uow.run(work),
    readOnly: (work) => uow.readOnly(work),
    ifoodMerchant: () => ifoodMerchantFor(credentialStore, establishmentId, config, logger),
    useCases: {
      createOrder: new CreateOrder(uow, geocoder, ids, clock, establishmentId),
      geocodeOrder: new GeocodeOrder(uow, geocoder, clock),
      importOrders: new ImportOrderFromSource(
        uow,
        geocoder,
        ids,
        clock,
        establishmentId,
        logger,
        /*
         * Lido a cada pedido, não uma vez na montagem: o worker vive por horas
         * e o dono pode ligar o aceite automático no meio do turno.
         */
        async () =>
          (
            await prisma.establishment.findUnique({
              where: { id: establishmentId },
              select: { autoConfirmOrders: true },
            })
          )?.autoConfirmOrders ?? false,
      ),
      planRoute: new PlanRoute(uow, routing, optimizer, ids, clock, undefined, config.PUBLIC_BASE_URL),
      startRoute: new StartRoute(uow, clock),
      replanFromHere: new ReplanFromHere(uow, routing, optimizer, clock),
      completeStop: new CompleteStop(uow, clock),
      recordPing: new RecordCourierPing(uow, clock),
      saveProduct: new SaveProduct(uow, ids, establishmentId),
      saveCourierPay: new SaveCourierPay(uow, establishmentId),
      reorderCatalog: new ReorderCatalog(uow),
      setProductActive: new SetProductActive(uow),
      removeProduct: new RemoveProduct(uow),
      renameCategory: new RenameCategory(uow),
      saveOptionGroup: new SaveOptionGroup(uow, ids),
      advanceOrderStage: new AdvanceOrderStage(uow, clock),
      /*
       * A origem do pedido escolhe o canal: um estabelecimento pode ter iFood e
       * aiqfome ligados ao mesmo tempo, e cancelar no lugar errado não faria
       * nada visível — o pedido seguiria vivo na plataforma certa.
       */
      cancelOrder: new CancelOrder(
        uow,
        (kind) =>
          kind === 'IFOOD' || kind === 'AIQFOME'
            ? marketplaceCommandsFor(credentialStore, establishmentId, kind, config, logger)
            : Promise.resolve(null),
        clock,
        logger,
      ),
      createPayment: new CreatePayment(
        uow,
        mercadoPagoGateway,
        ids,
        clock,
        establishmentId,
        () => mercadoPagoToken(),
      ),
      confirmPayment: new ConfirmPayment(
        uow,
        mercadoPagoGateway,
        clock,
        establishmentId,
        () => mercadoPagoToken(),
      ),
      saveCourier: new SaveCourier(uow, ids, establishmentId),
      setCourierActive: new SetCourierActive(uow),
      tracking: new GetTrackingSnapshot(uow, clock),
    },
  };

  containers.set(establishmentId, container);
  return container;
}
