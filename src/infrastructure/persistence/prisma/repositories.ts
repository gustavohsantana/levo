import type {
  OrderStatus as OrderStatusEnum,
  PaymentStatus as PaymentStatusEnum,
  Prisma,
  RouteStatus as RouteStatusEnum,
} from '@/generated/prisma/client';
import {
  Coordinates,
  type Courier,
  type CourierPingRepository,
  type CourierRepository,
  type DomainEvent,
  type Establishment,
  type EstablishmentRepository,
  type EventStore,
  type GeocodeCacheRepository,
  NotFoundError,
  type Order,
  type OrderRepository,
  type OrderSourceKind,
  type Payment,
  type PaymentRepository,
  type Repositories,
  type Route,
  type RouteRepository,
  type MarketplaceOutbox,
  type MarketplaceCommandEntry,
  type DeliveryFeeBand,
  Money,
  Product,
  type ProductRepository,
  type OptionGroupRepository,
  type OptionGroupSpec,
} from '@/core';
import { CourierMapper, EstablishmentMapper, OrderMapper, PaymentMapper, RouteMapper } from './mappers';
import type { CourierPayAgreement } from '@/core/services/courier-pay';

type Tx = Prisma.TransactionClient;

/** Rota que ainda não terminou: planejada ou em andamento. */
const ACTIVE_ROUTE_STATUSES: RouteStatusEnum[] = ['PLANNED', 'IN_PROGRESS'];

/** Pedido ainda sem rota. */
const PENDING_ORDER: OrderStatusEnum = 'NEW';

/**
 * Repositórios Prisma.
 *
 * Cada um recebe o `establishmentId` no construtor e **nenhum método aceita
 * esse id como parâmetro**. Não existe, na superfície pública destas classes,
 * uma forma de pedir dado de outro estabelecimento — o escopo não depende de
 * alguém lembrar de passá-lo.
 */

abstract class TenantScoped {
  constructor(
    protected readonly tx: Tx,
    protected readonly establishmentId: string,
  ) {}

  /** Todo `where` do repositório passa por aqui. */
  protected scoped<T extends object>(where: T) {
    return { ...where, establishmentId: this.establishmentId };
  }
}

export class PrismaOrderRepository extends TenantScoped implements OrderRepository {
  async save(order: Order): Promise<void> {
    const data = OrderMapper.toPersistence(order);
    await this.tx.order.upsert({ where: { id: order.id }, create: data, update: data });

    /*
     * Itens são reescritos por inteiro, não sincronizados linha a linha.
     * A lista é curta e imutável depois de criada — comparar o que mudou seria
     * mais código e mais chance de erro para o mesmo resultado.
     *
     * Só toca no banco quando há itens: pedido de marketplace não tem nenhum,
     * e um `deleteMany` por pedido importado seria uma escrita a cada ciclo do
     * worker sem nada para apagar.
     */
    if (order.items.length === 0) return;

    await this.tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await this.tx.orderItem.createMany({
      data: order.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        name: item.name,
        options: item.options ?? [],
        unitPriceCents: item.unitPrice.cents,
        quantity: item.quantity,
        discountCents: item.discount.cents,
      })),
    });
  }

  async saveMany(orders: Order[]): Promise<void> {
    // Sequencial de propósito: são poucas dezenas por rota, e já estamos dentro
    // de uma transação. Paralelizar aqui só disputaria conexões do pool.
    for (const order of orders) await this.save(order);
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.tx.order.findFirst({
      where: this.scoped({ id }),
      include: { items: true },
    });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findManyByIds(ids: string[]): Promise<Order[]> {
    const rows = await this.tx.order.findMany({ where: this.scoped({ id: { in: ids } }) });
    return rows.map(OrderMapper.toDomain);
  }

  async findBySourceRef(source: OrderSourceKind, externalId: string): Promise<Order | null> {
    const row = await this.tx.order.findFirst({ where: this.scoped({ source, externalId }) });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findByTrackingToken(token: string): Promise<Order | null> {
    // Único caso legitimamente sem escopo de tenant: o token *é* a credencial,
    // e quem abre o link não sabe de que estabelecimento é o pedido.
    const row = await this.tx.order.findUnique({ where: { trackingToken: token } });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async listPending(): Promise<Order[]> {
    /*
     * Com os itens: o painel precisa mostrar o que tem dentro do pedido, e sem
     * isto o dono via nome, endereço e valor sem saber o que preparar. A fila
     * pendente tem dezenas de linhas, não milhares — o custo do `include` aqui
     * é irrelevante perto de não poder ver o pedido.
     *
     * Pagamento online só entra na fila depois de aprovado. Recusado, em
     * análise e Pix à espera não são pedido da cozinha.
     */
    const rows = await this.tx.order.findMany({
      where: this.scoped({
        status: PENDING_ORDER,
        OR: [
          { paymentStatus: null },
          { paymentStatus: { in: ['PAID', 'CHARGED_BACK'] as PaymentStatusEnum[] } },
        ],
      }),
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(OrderMapper.toDomain);
  }

  async listOfDay(day: Date): Promise<Order[]> {
    /*
     * Com os itens: Finalizados hoje abre o mesmo detalhe do quadro. Sem isto
     * o dono via nome e valor e, quando o cliente ligava dizendo que o pedido
     * veio errado, não tinha o que conferir.
     */
    const rows = await this.tx.order.findMany({
      where: this.scoped({ createdAt: dayRange(day) }),
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(OrderMapper.toDomain);
  }
}

export class PrismaPaymentRepository extends TenantScoped implements PaymentRepository {
  async save(payment: Payment): Promise<void> {
    const data = PaymentMapper.toPersistence(payment);
    await this.tx.payment.upsert({ where: { id: payment.id }, create: data, update: data });
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.tx.payment.findFirst({ where: this.scoped({ id }) });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async listPendingOlderThan(antesDe: Date, limite: number): Promise<Payment[]> {
    const rows = await this.tx.payment.findMany({
      where: this.scoped({
        status: 'PENDING' as PaymentStatusEnum,
        createdAt: { lt: antesDe },
      }),
      // Mais antigos primeiro: são os que já venceram, e cada rodada limpa a
      // frente da fila em vez de revisitar sempre os mesmos recentes.
      orderBy: { createdAt: 'asc' },
      take: limite,
    });

    return rows.map(PaymentMapper.toDomain);
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const row = await this.tx.payment.findFirst({ where: this.scoped({ orderId }) });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async findByExternalId(
    provider: Payment['provider'],
    externalId: string,
  ): Promise<Payment | null> {
    const row = await this.tx.payment.findFirst({
      where: this.scoped({ provider, externalId }),
    });
    return row ? PaymentMapper.toDomain(row) : null;
  }
}

export class PrismaRouteRepository extends TenantScoped implements RouteRepository {
  async save(route: Route): Promise<void> {
    const data = RouteMapper.toPersistence(route);
    await this.tx.route.upsert({ where: { id: route.id }, create: data, update: data });

    for (const stop of route.stops) {
      const stopData = RouteMapper.stopToPersistence(stop, route.id);
      await this.tx.routeStop.upsert({
        where: { id: stop.id },
        create: stopData,
        update: stopData,
      });
    }
  }

  async findById(id: string): Promise<Route | null> {
    const row = await this.tx.route.findFirst({
      where: this.scoped({ id }),
      include: { stops: true },
    });
    return row ? RouteMapper.toDomain(row) : null;
  }

  async listActive(): Promise<Route[]> {
    const rows = await this.tx.route.findMany({
      where: this.scoped({ status: { in: ACTIVE_ROUTE_STATUSES } }),
      include: { stops: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(RouteMapper.toDomain);
  }

  async listOfDay(day: Date): Promise<Route[]> {
    const rows = await this.tx.route.findMany({
      where: this.scoped({ createdAt: dayRange(day) }),
      include: { stops: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(RouteMapper.toDomain);
  }

  async listByCourier(courierId: string, from: Date, to: Date): Promise<Route[]> {
    const rows = await this.tx.route.findMany({
      where: this.scoped({ courierId, createdAt: { gte: from, lt: to } }),
      include: { stops: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(RouteMapper.toDomain);
  }

  async hasActiveRouteFor(courierId: string): Promise<boolean> {
    const count = await this.tx.route.count({
      where: this.scoped({ courierId, status: { in: ACTIVE_ROUTE_STATUSES } }),
    });
    return count > 0;
  }

  /** Usado pelo link sem senha do motoboy — o token é a credencial. */
  async findByAccessToken(token: string): Promise<Route | null> {
    const row = await this.tx.route.findUnique({
      where: { accessToken: token },
      include: { stops: true },
    });
    return row ? RouteMapper.toDomain(row) : null;
  }
}

export class PrismaCourierRepository extends TenantScoped implements CourierRepository {
  async save(courier: Courier): Promise<void> {
    const data = CourierMapper.toPersistence(courier);
    await this.tx.courier.upsert({ where: { id: courier.id }, create: data, update: data });
  }

  async findById(id: string): Promise<Courier | null> {
    const row = await this.tx.courier.findFirst({ where: this.scoped({ id }) });
    return row ? CourierMapper.toDomain(row) : null;
  }

  async listActive(): Promise<Courier[]> {
    const rows = await this.tx.courier.findMany({
      where: this.scoped({ active: true }),
      orderBy: { name: 'asc' },
    });
    return rows.map(CourierMapper.toDomain);
  }

  async list(): Promise<Courier[]> {
    const rows = await this.tx.courier.findMany({
      where: this.scoped({}),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map(CourierMapper.toDomain);
  }

  async payAgreement(courierId: string): Promise<CourierPayAgreement> {
    const row = await this.tx.courier.findFirst({
      where: { id: courierId, establishmentId: this.establishmentId },
      select: {
        payModel: true,
        payPerDeliveryCents: true,
        payDailyCents: true,
        payBands: { orderBy: { uptoMeters: 'asc' }, select: { uptoMeters: true, amountCents: true } },
      },
    });

    return {
      model: row?.payModel ?? 'POR_ENTREGA',
      perDelivery: Money.fromCents(row?.payPerDeliveryCents ?? 0),
      daily: Money.fromCents(row?.payDailyCents ?? 0),
      bands: (row?.payBands ?? []).map((b) => ({
        uptoMeters: b.uptoMeters,
        amount: Money.fromCents(b.amountCents),
      })),
    };
  }

  async savePayAgreement(courierId: string, acordo: CourierPayAgreement): Promise<void> {
    await this.tx.courier.update({
      where: { id: courierId },
      data: {
        payModel: acordo.model,
        payPerDeliveryCents: acordo.perDelivery.cents,
        payDailyCents: acordo.daily.cents,
      },
    });

    /*
     * Reescreve as faixas em vez de comparar linha a linha — mesma razão das
     * faixas de taxa: meia dúzia de linhas editadas de uma vez na tela.
     */
    await this.tx.courierPayBand.deleteMany({ where: { courierId } });
    if (acordo.bands.length === 0) return;

    await this.tx.courierPayBand.createMany({
      data: acordo.bands.map((b) => ({
        courierId,
        uptoMeters: b.uptoMeters,
        amountCents: b.amount.cents,
      })),
    });
  }

}

export class PrismaEstablishmentRepository extends TenantScoped implements EstablishmentRepository {
  async current(): Promise<Establishment> {
    const row = await this.tx.establishment.findUnique({ where: { id: this.establishmentId } });
    if (!row) throw new NotFoundError('Estabelecimento', this.establishmentId);
    return EstablishmentMapper.toDomain(row);
  }
  async setAutoConfirm(ligado: boolean): Promise<void> {
    await this.tx.establishment.update({
      where: { id: this.establishmentId },
      data: { autoConfirmOrders: ligado },
    });
  }

  async setWhatsappRoutes(ligado: boolean): Promise<void> {
    await this.tx.establishment.update({
      where: { id: this.establishmentId },
      data: { whatsappRoutes: ligado },
    });
  }

  async categoryOrder(): Promise<string[]> {
    const row = await this.tx.establishment.findUnique({
      where: { id: this.establishmentId },
      select: { categoryOrder: true },
    });
    return row?.categoryOrder ?? [];
  }

  async saveCategoryOrder(nomes: string[]): Promise<void> {
    await this.tx.establishment.update({
      where: { id: this.establishmentId },
      data: { categoryOrder: nomes },
    });
  }
  async saveSettings(
    city: string | null,
    state: string | null,
    deliveryFeeCents: number,
    slug: string,
  ): Promise<void> {
    await this.tx.establishment.update({
      where: { id: this.establishmentId },
      data: { city, state, deliveryFeeCents, slug },
    });
  }
  async deliveryFeeBands(): Promise<DeliveryFeeBand[]> {
    const rows = await this.tx.deliveryFeeRule.findMany({
      where: { establishmentId: this.establishmentId },
      orderBy: { uptoMeters: 'asc' },
    });

    return rows.map((row) => ({
      uptoMeters: row.uptoMeters,
      fee: Money.fromCents(row.feeCents),
    }));
  }

  async saveDeliveryFeeBands(bands: DeliveryFeeBand[]): Promise<void> {
    /*
     * Reescreve tudo em vez de comparar faixa a faixa. A lista tem meia dúzia
     * de linhas e é editada de uma vez na tela — sincronizar seria mais código
     * e mais chance de deixar faixa órfã para o mesmo resultado.
     */
    await this.tx.deliveryFeeRule.deleteMany({
      where: { establishmentId: this.establishmentId },
    });

    if (bands.length === 0) return;

    await this.tx.deliveryFeeRule.createMany({
      data: bands.map((band) => ({
        establishmentId: this.establishmentId,
        uptoMeters: band.uptoMeters,
        feeCents: band.fee.cents,
      })),
    });
  }
}

export class PrismaCourierPingRepository implements CourierPingRepository {
  constructor(private readonly tx: Tx) {}

  async record(routeId: string, coordinates: Coordinates, at: Date): Promise<void> {
    await this.tx.courierPing.create({
      data: { routeId, lat: coordinates.lat, lng: coordinates.lng, recordedAt: at },
    });
  }

  async lastPing(routeId: string) {
    const row = await this.tx.courierPing.findFirst({
      where: { routeId },
      orderBy: { recordedAt: 'desc' },
    });
    return row ? { coordinates: Coordinates.create(row.lat, row.lng), at: row.recordedAt } : null;
  }

  async trail(routeId: string, limit: number) {
    const rows = await this.tx.courierPing.findMany({
      where: { routeId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return rows
      .reverse()
      .map((row) => ({ coordinates: Coordinates.create(row.lat, row.lng), at: row.recordedAt }));
  }

  /**
   * Retenção do trajeto.
   *
   * Serve a duas coisas com a mesma medida: LGPD (localização é dado pessoal e
   * não tem por que ficar guardada) e escala (esta é a tabela mais escrita do
   * sistema, e a primeira a incomodar quando houver 100 clientes).
   */
  async purgeFinishedBefore(cutoff: Date): Promise<number> {
    const { count } = await this.tx.courierPing.deleteMany({
      where: { recordedAt: { lt: cutoff }, route: { status: 'FINISHED' } },
    });
    return count;
  }
}

export class PrismaEventStore implements EventStore {
  constructor(private readonly tx: Tx) {}

  async append(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.tx.domainEventLog.createMany({
      data: events.map((event) => ({
        establishmentId: event.establishmentId,
        name: event.name,
        aggregateId: event.aggregateId,
        payload: event.payload as Prisma.InputJsonValue,
        occurredAt: event.occurredAt,
      })),
    });
  }
}

export class PrismaGeocodeCacheRepository implements GeocodeCacheRepository {
  constructor(private readonly tx: Tx) {}

  async get(cacheKey: string): Promise<Coordinates | null> {
    const row = await this.tx.geocodeCache.findUnique({ where: { cacheKey } });
    return row ? Coordinates.create(row.lat, row.lng) : null;
  }

  async set(cacheKey: string, coordinates: Coordinates): Promise<void> {
    const data = { cacheKey, lat: coordinates.lat, lng: coordinates.lng };
    await this.tx.geocodeCache.upsert({ where: { cacheKey }, create: data, update: data });
  }
}

/**
 * Caixa de saída dos avisos ao marketplace.
 *
 * O `skipDuplicates` faz do enfileiramento uma operação idempotente: o índice
 * único por (provedor, pedido, comando) recusa o segundo "entregue" do mesmo
 * pedido sem erro. Isso importa porque o mesmo caso de uso pode rodar de novo
 * — reenvio da fila offline do celular, por exemplo — e um aviso duplicado
 * viraria uma chamada duplicada à API de terceiro.
 */
export class PrismaMarketplaceOutbox implements MarketplaceOutbox {
  constructor(private readonly tx: Tx) {}

  async enqueue(entries: MarketplaceCommandEntry[]): Promise<void> {
    if (entries.length === 0) return;

    await this.tx.marketplaceCommand.createMany({ data: entries, skipDuplicates: true });
  }
}

export class PrismaCourierNotificationOutbox extends TenantScoped {
  /**
   * Enfileira a mensagem da rota.
   *
   * `routeId` e unico: replanejar a mesma rota nao manda dois WhatsApp, e a
   * idempotencia sai do banco em vez de virar logica aqui.
   */
  async enqueue(input: { routeId: string; phone: string; text: string }): Promise<void> {
    await this.tx.courierNotification.upsert({
      where: { routeId: input.routeId },
      create: {
        establishmentId: this.establishmentId,
        routeId: input.routeId,
        phone: input.phone,
        text: input.text,
      },
      update: {},
    });
  }
}

export class PrismaProductRepository implements ProductRepository {
  constructor(
    private readonly tx: Tx,
    private readonly establishmentId: string,
  ) {}

  async list(options: { onlyActive?: boolean } = {}): Promise<Product[]> {
    const rows = await this.tx.product.findMany({
      where: {
        establishmentId: this.establishmentId,
        ...(options.onlyActive ? { active: true } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.tx.product.findFirst({
      where: { id, establishmentId: this.establishmentId },
    });

    return row ? toProduct(row) : null;
  }

  async findManyByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];

    const rows = await this.tx.product.findMany({
      where: { id: { in: ids }, establishmentId: this.establishmentId },
    });

    return rows.map(toProduct);
  }

  async save(product: Product): Promise<void> {
    const dados = {
      establishmentId: this.establishmentId,
      name: product.name,
      description: product.description,
      priceCents: product.price.cents,
      category: product.category,
      imageUrl: product.imageUrl,
      active: product.active,
      position: product.position,
      source: product.source,
      externalId: product.externalId,
    };

    await this.tx.product.upsert({
      where: { id: product.id },
      create: { id: product.id, ...dados },
      update: dados,
    });
  }

  async delete(id: string): Promise<void> {
    // `deleteMany` com o filtro de tenant: `delete` por id apagaria produto de
    // outro estabelecimento se um id vazasse.
    await this.tx.product.deleteMany({ where: { id, establishmentId: this.establishmentId } });
  }

  async renameCategory(de: string, para: string): Promise<number> {
    const { count } = await this.tx.product.updateMany({
      where: { establishmentId: this.establishmentId, category: de },
      data: { category: para },
    });

    return count;
  }
}

function toProduct(row: {
  id: string;
  establishmentId: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  position: number;
  source: OrderSourceKind;
  externalId: string | null;
}): Product {
  return Product.restore({
    id: row.id,
    establishmentId: row.establishmentId,
    name: row.name,
    description: row.description,
    price: Money.fromCents(row.priceCents),
    category: row.category,
    imageUrl: row.imageUrl,
    active: row.active,
    position: row.position,
    source: row.source,
    externalId: row.externalId,
  });
}

export class PrismaOptionGroupRepository implements OptionGroupRepository {
  constructor(
    private readonly tx: Tx,
    private readonly establishmentId: string,
  ) {}

  async list(): Promise<OptionGroupSpec[]> {
    const rows = await this.tx.optionGroup.findMany({
      where: { establishmentId: this.establishmentId },
      include: { options: { orderBy: { position: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return rows.map(paraSpec);
  }

  async findById(id: string): Promise<OptionGroupSpec | null> {
    const row = await this.tx.optionGroup.findFirst({
      where: { id, establishmentId: this.establishmentId },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    return row ? paraSpec(row) : null;
  }

  async forProduct(productId: string): Promise<OptionGroupSpec[]> {
    const rows = await this.tx.productOptionGroup.findMany({
      where: { productId, group: { establishmentId: this.establishmentId } },
      include: { group: { include: { options: { orderBy: { position: 'asc' } } } } },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => paraSpec(row.group));
  }

  /**
   * Uma consulta para o cardápio inteiro.
   *
   * Buscar grupo por produto num laço faria N+1 na tela que o cliente abre — e
   * é a tela com mais pressa de todas.
   */
  async forProducts(productIds: string[]): Promise<Map<string, OptionGroupSpec[]>> {
    if (productIds.length === 0) return new Map();

    const rows = await this.tx.productOptionGroup.findMany({
      where: {
        productId: { in: productIds },
        group: { establishmentId: this.establishmentId },
      },
      include: { group: { include: { options: { orderBy: { position: 'asc' } } } } },
      orderBy: { position: 'asc' },
    });

    const porProduto = new Map<string, OptionGroupSpec[]>();
    for (const row of rows) {
      const lista = porProduto.get(row.productId) ?? [];
      lista.push(paraSpec(row.group));
      porProduto.set(row.productId, lista);
    }
    return porProduto;
  }

  async save(grupo: OptionGroupSpec): Promise<void> {
    await this.tx.optionGroup.upsert({
      where: { id: grupo.id },
      create: {
        id: grupo.id,
        establishmentId: this.establishmentId,
        name: grupo.name,
        min: grupo.min,
        max: grupo.max,
      },
      update: { name: grupo.name, min: grupo.min, max: grupo.max },
    });

    /*
     * Apaga e recria as opções.
     *
     * O `id` da opção vive no pedido já gravado apenas como NOME copiado, não
     * como referência — então trocar o id não reescreve histórico. Reconciliar
     * uma a uma custaria complexidade para salvar uma lista de dez itens.
     */
    await this.tx.option.deleteMany({ where: { groupId: grupo.id } });
    if (grupo.options.length > 0) {
      await this.tx.option.createMany({
        data: grupo.options.map((opcao, indice) => ({
          id: opcao.id,
          groupId: grupo.id,
          name: opcao.name,
          priceCents: opcao.price.cents,
          position: indice,
        })),
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.tx.optionGroup.deleteMany({ where: { id, establishmentId: this.establishmentId } });
  }

  async setForProduct(productId: string, groupIds: string[]): Promise<void> {
    await this.tx.productOptionGroup.deleteMany({ where: { productId } });
    if (groupIds.length > 0) {
      await this.tx.productOptionGroup.createMany({
        data: groupIds.map((groupId, indice) => ({ productId, groupId, position: indice })),
      });
    }
  }

  async attachToCategory(groupId: string, category: string): Promise<number> {
    const produtos = await this.tx.product.findMany({
      where: { establishmentId: this.establishmentId, category },
      select: { id: true },
    });

    // `skipDuplicates` porque anexar de novo é operação normal: o dono clica
    // depois de cadastrar mais produtos na mesma categoria.
    const r = await this.tx.productOptionGroup.createMany({
      data: produtos.map((p) => ({ productId: p.id, groupId, position: 99 })),
      skipDuplicates: true,
    });
    return r.count;
  }
}

function paraSpec(row: {
  id: string;
  name: string;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; priceCents: number }>;
}): OptionGroupSpec {
  return {
    id: row.id,
    name: row.name,
    min: row.min,
    max: row.max,
    options: row.options.map((o) => ({
      id: o.id,
      name: o.name,
      price: Money.fromCents(o.priceCents),
    })),
  };
}

export function buildRepositories(tx: Tx, establishmentId: string): Repositories {
  return {
    orders: new PrismaOrderRepository(tx, establishmentId),
    payments: new PrismaPaymentRepository(tx, establishmentId),
    routes: new PrismaRouteRepository(tx, establishmentId),
    couriers: new PrismaCourierRepository(tx, establishmentId),
    establishments: new PrismaEstablishmentRepository(tx, establishmentId),
    pings: new PrismaCourierPingRepository(tx),
    products: new PrismaProductRepository(tx, establishmentId),
    optionGroups: new PrismaOptionGroupRepository(tx, establishmentId),
    events: new PrismaEventStore(tx),
    marketplace: new PrismaMarketplaceOutbox(tx),
    geocodeCache: new PrismaGeocodeCacheRepository(tx),
    courierNotifications: new PrismaCourierNotificationOutbox(tx, establishmentId),
  };
}

function dayRange(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}
