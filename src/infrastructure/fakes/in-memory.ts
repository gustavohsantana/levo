import {
  type Clock,
  type Coordinates,
  type Courier,
  type CourierPingRepository,
  type CourierRepository,
  type DomainEvent,
  Establishment,
  type EstablishmentRepository,
  type EventStore,
  type GeocodeCacheRepository,
  type IdGenerator,
  type Order,
  type OrderRepository,
  type OrderSourceKind,
  type Payment,
  type PaymentRepository,
  type Repositories,
  type Route,
  RouteStatus,
  type RouteRepository,
  type UnitOfWork,
  type MarketplaceOutbox,
  type MarketplaceCommandEntry,
  type DeliveryFeeBand,
  Product,
  type ProductRepository,
  type OptionGroupRepository,
  type OptionGroupSpec,
} from '@/core';
import { Money } from '@/core';
import type { CourierPayAgreement } from '@/core/services/courier-pay';

/**
 * Implementações em memória das ports, para teste.
 *
 * Existem porque os casos de uso dependem de interfaces, não do Prisma: dá para
 * exercitar toda a regra de negócio sem subir banco, sem rede, em
 * milissegundos. É o motivo prático da regra de dependência — sem ela, todo
 * teste de `PlanRoute` precisaria de um Postgres de pé.
 */
export class InMemoryDatabase {
  orders = new Map<string, Order>();
  payments = new Map<string, Payment>();
  routes = new Map<string, Route>();
  couriers = new Map<string, Courier>();
  pings = new Map<string, Array<{ coordinates: Coordinates; at: Date }>>();
  geocodeCache = new Map<string, Coordinates>();
  /** Avisos enfileirados para o marketplace, por (provedor, pedido, comando). */
  marketplace = new Map<string, MarketplaceCommandEntry>();
  optionGroups = new Map<string, OptionGroupSpec>();
  /** Grupos de cada produto, na ordem. */
  productGroups = new Map<string, string[]>();
  /** Aceite automático de pedido de marketplace. */
  autoConfirmOrders = false;
  whatsappRoutes = false;
  categoryOrder: string[] = [];
  notificacoes = new Map<
    string,
    {
      routeId: string;
      channel: 'TELEGRAM' | 'WHATSAPP';
      destination: string;
      text: string;
      link: string;
    }
  >();
  acordos = new Map<string, CourierPayAgreement>();
  products = new Map<string, Product>();
  deliveryFeeBands: DeliveryFeeBand[] = [];
  events: DomainEvent[] = [];

  constructor(readonly establishment: Establishment) {}

  eventsNamed(name: string): DomainEvent[] {
    return this.events.filter((event) => event.name === name);
  }
}

export class InMemoryUnitOfWork implements UnitOfWork {
  constructor(private readonly db: InMemoryDatabase) {}

  async run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return work(buildRepositories(this.db));
  }
}

function buildRepositories(db: InMemoryDatabase): Repositories {
  const orders: OrderRepository = {
    async save(order) {
      db.orders.set(order.id, order);
    },
    async saveMany(list) {
      for (const order of list) db.orders.set(order.id, order);
    },
    async findById(id) {
      return db.orders.get(id) ?? null;
    },
    async findManyByIds(ids) {
      return ids.map((id) => db.orders.get(id)).filter((order): order is Order => !!order);
    },
    async findBySourceRef(source: OrderSourceKind, externalId: string) {
      return (
        [...db.orders.values()].find(
          (order) => order.source === source && order.externalId === externalId,
        ) ?? null
      );
    },
    async findByTrackingToken(token) {
      return (
        [...db.orders.values()].find((order) => order.trackingToken.value === token) ?? null
      );
    },
    async listPending() {
      return [...db.orders.values()].filter(
        (order) => order.status === 'NEW' && order.isReleasedToKitchen,
      );
    },
    async listOfDay(day) {
      return [...db.orders.values()].filter((order) => sameDay(order.createdAt, day));
    },
  };

  const routes: RouteRepository = {
    async save(route) {
      db.routes.set(route.id, route);
    },
    async findById(id) {
      return db.routes.get(id) ?? null;
    },
    async listActive() {
      return [...db.routes.values()].filter((route) => !route.isFinished);
    },
    async listOfDay(day) {
      return [...db.routes.values()].filter((route) => sameDay(route.createdAt, day));
    },
    async listByCourier(courierId, from, to) {
      return [...db.routes.values()]
        .filter(
          (route) =>
            route.courierId === courierId &&
            route.createdAt >= from &&
            route.createdAt < to,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async hasActiveRouteFor(courierId) {
      return [...db.routes.values()].some(
        (route) => route.courierId === courierId && route.status !== RouteStatus.Finished,
      );
    },
  };

  const couriers: CourierRepository = {
    async save(courier) {
      db.couriers.set(courier.id, courier);
    },
    async findById(id) {
      return db.couriers.get(id) ?? null;
    },
    async listActive() {
      return [...db.couriers.values()].filter((courier) => courier.active);
    },
    async list() {
      return [...db.couriers.values()];
    },
    async payAgreement(courierId) {
      return (
        db.acordos.get(courierId) ?? {
          model: 'POR_ENTREGA',
          perDelivery: Money.fromCents(0),
          daily: Money.fromCents(0),
          bands: [],
        }
      );
    },
    async savePayAgreement(courierId, acordo) {
      db.acordos.set(courierId, acordo);
    },
  };

  const optionGroups: OptionGroupRepository = {
    async list() {
      return [...db.optionGroups.values()];
    },
    async findById(id) {
      return db.optionGroups.get(id) ?? null;
    },
    async forProduct(productId) {
      return (db.productGroups.get(productId) ?? [])
        .map((id) => db.optionGroups.get(id))
        .filter((g): g is OptionGroupSpec => Boolean(g));
    },
    async forProducts(productIds) {
      const mapa = new Map<string, OptionGroupSpec[]>();
      for (const productId of productIds) {
        const grupos = (db.productGroups.get(productId) ?? [])
          .map((id) => db.optionGroups.get(id))
          .filter((g): g is OptionGroupSpec => Boolean(g));
        if (grupos.length > 0) mapa.set(productId, grupos);
      }
      return mapa;
    },
    async save(grupo) {
      db.optionGroups.set(grupo.id, grupo);
    },
    async delete(id) {
      db.optionGroups.delete(id);
      for (const [produto, ids] of db.productGroups) {
        db.productGroups.set(produto, ids.filter((g) => g !== id));
      }
    },
    async setForProduct(productId, groupIds) {
      db.productGroups.set(productId, [...groupIds]);
    },
    async attachToCategory(groupId, category) {
      let n = 0;
      for (const produto of db.products.values()) {
        if (produto.category !== category) continue;
        const atuais = db.productGroups.get(produto.id) ?? [];
        if (atuais.includes(groupId)) continue;
        db.productGroups.set(produto.id, [...atuais, groupId]);
        n += 1;
      }
      return n;
    },
  };

  const establishments: EstablishmentRepository = {
    async current() {
      /*
       * Reflete os interruptores que o próprio fake guarda.
       *
       * Devolver a entidade fixa fazia `setAutoConfirm` e `setWhatsappRoutes`
       * gravarem num campo que ninguém lia de volta — o teste passava com o
       * recurso ligado e desligado igual, que é o pior tipo de fake: o que
       * concorda com qualquer coisa.
       */
      const e = db.establishment;
      return new Establishment(
        e.id,
        e.name,
        e.address,
        e.coordinates,
        e.city,
        e.state,
        e.deliveryFee,
        e.slug,
        db.autoConfirmOrders,
        db.whatsappRoutes,
      );
    },

    async setAutoConfirm(ligado) {
      db.autoConfirmOrders = ligado;
    },

    async setWhatsappRoutes(ligado) {
      db.whatsappRoutes = ligado;
    },

    async deliveryFeeBands() {
      return db.deliveryFeeBands;
    },
    async saveDeliveryFeeBands(bands) {
      db.deliveryFeeBands = bands;
    },
    async saveSettings() {
      // O fake guarda o estabelecimento imutável; a região não é lida em
      // nenhum teste de regra, e fingir persistência aqui só criaria estado.
    },

    async categoryOrder() {
      return db.categoryOrder;
    },
    async saveCategoryOrder(nomes) {
      db.categoryOrder = nomes;
    },
  };

  const pings: CourierPingRepository = {
    async record(routeId, coordinates, at) {
      const trail = db.pings.get(routeId) ?? [];
      trail.push({ coordinates, at });
      db.pings.set(routeId, trail);
    },
    async lastPing(routeId) {
      const trail = db.pings.get(routeId) ?? [];
      return trail.at(-1) ?? null;
    },
    async trail(routeId, limit) {
      return (db.pings.get(routeId) ?? []).slice(-limit);
    },
    async purgeFinishedBefore() {
      return 0;
    },
  };

  const events: EventStore = {
    async append(list) {
      db.events.push(...list);
    },
  };

  const marketplace: MarketplaceOutbox = {
    async enqueue(entries) {
      for (const entrada of entries) {
        // Espelha o índice único do banco: sem isto os testes não veriam a
        // duplicata que a produção recusa.
        const chave = `${entrada.provider}:${entrada.externalOrderId}:${entrada.command}`;
        if (!db.marketplace.has(chave)) db.marketplace.set(chave, entrada);
      }
    },
  };

  const products: ProductRepository = {
    async list(options = {}) {
      const todos = [...db.products.values()];
      const visiveis = options.onlyActive ? todos.filter((p) => p.active) : todos;

      // Mesma ordem do banco: categoria e depois nome. Sem isto, um teste que
      // depende da ordem passaria aqui e falharia em produção.
      return visiveis.sort(
        (a, b) =>
          (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name),
      );
    },
    async findById(id) {
      return db.products.get(id) ?? null;
    },
    async findManyByIds(ids) {
      return ids.map((id) => db.products.get(id)).filter((p): p is Product => Boolean(p));
    },
    async save(product) {
      db.products.set(product.id, product);
    },
    async delete(id) {
      db.products.delete(id);
    },
    async renameCategory(de, para) {
      let contados = 0;
      for (const produto of db.products.values()) {
        if (produto.category !== de) continue;
        produto.edit({ category: para });
        contados += 1;
      }
      return contados;
    },
  };

  const payments: PaymentRepository = {
    async save(payment) {
      db.payments.set(payment.id, payment);
    },
    async findById(id) {
      return db.payments.get(id) ?? null;
    },
    async listPendingOlderThan(antesDe, limite) {
      return [...db.payments.values()]
        .filter((payment) => payment.status === 'PENDING' && payment.createdAt < antesDe)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, limite);
    },
    async findByOrderId(orderId) {
      return [...db.payments.values()].find((payment) => payment.orderId === orderId) ?? null;
    },
    async findByExternalId(provider, externalId) {
      return (
        [...db.payments.values()].find(
          (payment) => payment.provider === provider && payment.externalId === externalId,
        ) ?? null
      );
    },
  };

  const courierNotifications = {
    async enqueue(input: {
      routeId: string;
      channel: 'TELEGRAM' | 'WHATSAPP';
      destination: string;
      text: string;
      link: string;
    }) {
      db.notificacoes.set(input.routeId, input);
    },
  };

  const geocodeCache: GeocodeCacheRepository = {
    async get(key) {
      return db.geocodeCache.get(key) ?? null;
    },
    async set(key, coordinates) {
      db.geocodeCache.set(key, coordinates);
    },
  };

  return {
    orders,
    payments,
    routes,
    courierNotifications,
    couriers,
    establishments,
    pings,
    events,
    marketplace,
    products,
    optionGroups,
    geocodeCache,
  };
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Relógio controlável: teste de ETA e atraso precisa mandar no tempo. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }

  set(date: Date): void {
    this.current = date;
  }
}

/** Ids previsíveis deixam a asserção legível: 'id-1', 'id-2'... */
export class SequentialIds implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix = 'id') {}

  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}
