import 'server-only';
import { containerFor } from '@/composition-root';
import type { Order, Route } from '@/core';
import { requireSession } from './http/session';

/**
 * Leituras das telas do dono.
 *
 * Server Components chamam estas funções **direto**, sem passar por HTTP. Uma
 * API REST para consumo do próprio frontend seria uma camada a mais de
 * serialização, validação e tratamento de erro sem nenhum consumidor externo
 * para justificá-la. Os route handlers existem só para quem é de fora: webhook,
 * PWA do motoboy e a página pública de rastreio.
 */

export interface OrderView {
  id: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  reference: string | null;
  amountCents: number;
  notes: string | null;
  source: 'MANUAL' | 'SITE' | 'WEBHOOK' | 'IFOOD' | 'AIQFOME';
  /** Numero curto na plataforma. Nulo em pedido manual. */
  displayId: string | null;
  deliveryFeeCents: number;
  paymentMethod: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'ONLINE' | null;
  status: 'NEW' | 'IN_ROUTE' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  /** Coluna do painel. Derivado de `status` mais os carimbos de preparo. */
  stage: 'NOVO' | 'MONTANDO' | 'PRONTO' | 'EM_ROTA' | 'FINALIZADO';
  confirmedAt: string | null;
  readyAt: string | null;
  items: Array<{
    name: string;
    /** Complementos, como o marketplace os descreve. Vazio no pedido manual. */
    options: string[];
    quantity: number;
    unitPriceCents: number;
    discountCents: number;
  }>;
  isGeocoded: boolean;
  coordinates: { lat: number; lng: number } | null;
  createdAt: string;
  trackingUrl: string;
  whatsappLink: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'IN_REVIEW' | 'REJECTED' | 'CHARGED_BACK' | null;
}

export interface RouteView {
  id: string;
  courierId: string;
  courierName: string;
  /** Conversa do motoboy já com a rota escrita. `null` sem telefone válido. */
  courierWhatsappLink: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';
  accessToken: string;
  geometry: string | null;
  distanceMeters: number;
  durationSeconds: number;
  baselineDurationSeconds: number;
  savedSeconds: number;
  savedMinutes: number;
  createdAt: string;
  startedAt: string | null;
  stops: Array<{
    id: string;
    orderId: string;
    position: number;
    status: 'PENDING' | 'DELIVERED' | 'FAILED';
    etaSeconds: number;
    customerName: string;
    address: string;
    coordinates: { lat: number; lng: number } | null;
  }>;
}

export async function currentContainer() {
  const session = await requireSession();
  return { session, container: containerFor(session.establishmentId) };
}

function toOrderView(order: Order, whatsapp: string | null, trackingUrl: string): OrderView {
  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone?.value ?? null,
    address: order.address.raw,
    reference: order.address.reference,
    amountCents: order.amount.cents,
    deliveryFeeCents: order.deliveryFee.cents,
    paymentMethod: order.paymentMethod,
    source: order.source,
    displayId: order.displayId,
    notes: order.notes,
    status: order.status,
    isGeocoded: order.isGeocoded,
    coordinates: order.coordinates?.toJSON() ?? null,
    stage: order.stage,
    items: order.items.map((item) => ({
      name: item.name,
      options: item.options ?? [],
      quantity: item.quantity,
      unitPriceCents: item.unitPrice.cents,
      discountCents: item.discount.cents,
    })),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    trackingUrl,
    whatsappLink: whatsapp,
    paymentStatus: order.paymentStatus,
  };
}

/** Um grupo de opções como a tela precisa dele. */
export interface OptionGroupView {
  id: string;
  name: string;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; priceCents: number }>;
  /** Quantos produtos já oferecem este grupo. */
  produtos: number;
}

export interface ProductView {
  id: string;
  /** Os grupos que este produto oferece, na ordem da tela. */
  optionGroupIds: string[];
  name: string;
  description: string | null;
  priceCents: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  source: string;
  importado: boolean;
}

export async function getCatalog(): Promise<ProductView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const produtos = await repos.products.list();
    /*
     * Em lote: o catálogo tem dezenas de produtos, e uma consulta por produto
     * seria N+1 numa tela que o dono abre o tempo todo.
     */
    const grupos = await repos.optionGroups.forProducts(produtos.map((p) => p.id));

    return produtos.map((p) => ({
      id: p.id,
      optionGroupIds: (grupos.get(p.id) ?? []).map((g) => g.id),
      name: p.name,
      description: p.description,
      priceCents: p.price.cents,
      category: p.category,
      imageUrl: p.imageUrl,
      active: p.active,
      source: p.source,
      importado: p.importado,
    }));
  });
}

export interface CourierView {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  busy: boolean;
}

/**
 * Os grupos do estabelecimento, com quantos produtos usam cada um.
 *
 * A contagem existe para o dono não apagar sem saber o estrago: "Frutas" usado
 * por quatro produtos é decisão diferente de um grupo órfão.
 */
export async function getOptionGroups(): Promise<OptionGroupView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const grupos = await repos.optionGroups.list();
    const produtos = await repos.products.list();
    const porProduto = await repos.optionGroups.forProducts(produtos.map((p) => p.id));

    const uso = new Map<string, number>();
    for (const lista of porProduto.values()) {
      for (const g of lista) uso.set(g.id, (uso.get(g.id) ?? 0) + 1);
    }

    return grupos.map((g) => ({
      id: g.id,
      name: g.name,
      min: g.min,
      max: g.max,
      options: g.options.map((o) => ({ id: o.id, name: o.name, priceCents: o.price.cents })),
      produtos: uso.get(g.id) ?? 0,
    }));
  });
}

export async function getCouriers(): Promise<CourierView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const couriers = await repos.couriers.list();
    const ativas = await repos.routes.listActive();

    return couriers.map((courier) => ({
      id: courier.id,
      name: courier.name,
      phone: courier.phone.formatted,
      active: courier.active,
      busy: ativas.some((route) => route.courierId === courier.id),
    }));
  });
}

export interface CourierDay {
  /** `YYYY-MM-DD`, no fuso do estabelecimento. */
  date: string;
  routes: number;
  deliveries: number;
  failed: number;
  distanceMeters: number;
}

export interface CourierRouteView {
  id: string;
  createdAt: string;
  status: string;
  stops: number;
  deliveries: number;
  failed: number;
  distanceMeters: number;
  durationSeconds: number;
  /** Detalhe de cada parada, para o acordeão da tela. */
  paradas: Array<{
    position: number;
    customerName: string;
    address: string;
    status: 'PENDING' | 'DELIVERED' | 'FAILED';
    amountCents: number;
    /** Distância do trecho anterior até esta parada — o km desta entrega. */
    legDistanceMeters: number;
  }>;
}

/**
 * O mês de trabalho de um entregador.
 *
 * Serve para o acerto: por entrega, por dia ou por rota, o dono precisa do
 * número que ele usa para pagar. Por isso os totais vêm por dia e por rota, e
 * **não** por parada — a distância que guardamos é a da rota inteira, e
 * reparti-la entre as entregas seria estimativa apresentada como fato.
 */
export async function getCourierMonth(courierId: string, month: Date) {
  const { container } = await currentContainer();

  const from = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const to = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

  return container.read(async (repos) => {
    const courier = await repos.couriers.findById(courierId);
    const routes = await repos.routes.listByCourier(courierId, from, to);

    /*
     * Os pedidos vêm numa consulta só, e não uma por rota: um mês movimentado
     * tem dezenas de rotas, e uma ida ao banco por rota transformaria a tela
     * num travamento de segundos.
     */
    const pedidos = await repos.orders.findManyByIds(
      routes.flatMap((route) => route.stops.map((stop) => stop.orderId)),
    );
    const pedidoPorId = new Map(pedidos.map((pedido) => [pedido.id, pedido]));

    const porDia = new Map<string, CourierDay>();

    const detalhes: CourierRouteView[] = routes.map((route) => {
      const entregues = route.stops.filter((stop) => stop.status === 'DELIVERED').length;
      const falhas = route.stops.filter((stop) => stop.status === 'FAILED').length;
      const dia = diaLocal(route.createdAt);

      const atual = porDia.get(dia) ?? {
        date: dia,
        routes: 0,
        deliveries: 0,
        failed: 0,
        distanceMeters: 0,
      };

      porDia.set(dia, {
        ...atual,
        routes: atual.routes + 1,
        deliveries: atual.deliveries + entregues,
        failed: atual.failed + falhas,
        distanceMeters: atual.distanceMeters + route.distanceMeters,
      });

      return {
        id: route.id,
        createdAt: route.createdAt.toISOString(),
        status: route.status,
        stops: route.stops.length,
        deliveries: entregues,
        failed: falhas,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        paradas: [...route.stops]
          .sort((a, b) => a.position - b.position)
          .map((stop) => {
            const pedido = pedidoPorId.get(stop.orderId);
            return {
              position: stop.position,
              customerName: pedido?.customerName ?? '—',
              address: pedido?.address.raw ?? '—',
              status: stop.status,
              amountCents: pedido?.amount.cents ?? 0,
              legDistanceMeters: stop.legDistanceMeters,
            };
          }),
      };
    });

    return {
      courier: courier
        ? { id: courier.id, name: courier.name, phone: courier.phone.formatted, active: courier.active }
        : null,
      days: [...porDia.values()].sort((a, b) => a.date.localeCompare(b.date)),
      routes: detalhes,
    };
  });
}

/**
 * O dia como o lojista o vê, não como o servidor o guarda.
 *
 * O servidor roda em UTC; uma rota das 22h de Pouso Alegre cairia no dia
 * seguinte se agrupássemos pela data crua — e o acerto do mês fecharia errado
 * exatamente nas rotas de fim de expediente.
 */
function diaLocal(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function getDashboard() {
  const { session, container } = await currentContainer();

  return container.read(async (repos) => {
    /**
     * Sequencial, não `Promise.all`.
     *
     * Estas consultas rodam dentro de uma transação interativa do Prisma, e
     * disparar várias em paralelo sobre o mesmo cliente de transação é um
     * comportamento que a própria documentação desaconselha — o ganho aparente
     * não existe (o banco serializa a transação de qualquer jeito) e o risco de
     * erro sob carga, sim.
     */
    const establishment = await repos.establishments.current();
    const feeBands = await repos.establishments.deliveryFeeBands();
    const pending = await repos.orders.listPending();
    const todayOrders = await repos.orders.listOfDay(new Date());
    const activeRoutes = await repos.routes.listActive();
    const couriers = await repos.couriers.list();
    const todayRoutes = await repos.routes.listOfDay(new Date());

    /**
     * Uma rota que virou a meia-noite ainda está na rua, mas seus pedidos são
     * de ontem e não aparecem em `listOfDay`. Sem buscá-los explicitamente, o
     * painel mostraria "—" no lugar do nome de cada cliente justamente na rota
     * que o dono mais precisa acompanhar.
     */
    const routeOrderIds = activeRoutes.flatMap((route) =>
      route.stops.map((stop) => stop.orderId),
    );
    const knownIds = new Set(todayOrders.map((order) => order.id));
    const missing = routeOrderIds.filter((id) => !knownIds.has(id));
    const extraOrders = missing.length > 0 ? await repos.orders.findManyByIds(missing) : [];

    const orderById = new Map(
      [...todayOrders, ...extraOrders].map((order) => [order.id, order]),
    );

    return {
      session,
      establishment: {
        id: establishment.id,
        name: establishment.name,
        coordinates: establishment.coordinates.toJSON(),
        deliveryFeeReais: establishment.deliveryFee.reais,
        autoConfirmOrders: establishment.autoConfirmOrders,
        feeBands: feeBands.map((b) => ({ km: b.uptoMeters / 1000, reais: b.fee.reais })),
      },
      pending: pending.map((order) =>
        toOrderView(
          order,
          container.whatsapp.dispatchLink(order, establishment.name),
          container.whatsapp.trackingUrl(order),
        ),
      ),
      orders: todayOrders.map((order) =>
        toOrderView(
          order,
          container.whatsapp.dispatchLink(order, establishment.name),
          container.whatsapp.trackingUrl(order),
        ),
      ),
      couriers: couriers.map((courier) => ({
        id: courier.id,
        name: courier.name,
        phone: courier.phone.formatted,
        active: courier.active,
        busy: activeRoutes.some((route) => route.courierId === courier.id),
      })),
      activeRoutes: activeRoutes.map((route) =>
        toRouteView(
        route,
        orderById,
        couriers.find((c) => c.id === route.courierId)?.name ?? '—',
        container.whatsapp.routeLink({
          accessToken: route.accessToken.value,
          courierWhatsapp:
            couriers.find((c) => c.id === route.courierId)?.phone.whatsapp ?? null,
          courierName: couriers.find((c) => c.id === route.courierId)?.name ?? '',
          stops: route.stops.length,
        }),
      ),
      ),
      /** Números do dia — a evidência que o piloto precisa produzir. */
      today: {
        orders: todayOrders.length,
        delivered: todayOrders.filter((order) => order.status === 'DELIVERED').length,
        routes: todayRoutes.length,
        savedMinutes: todayRoutes.reduce((total, route) => total + route.savedMinutes, 0),
      },
    };
  });
}

function toRouteView(
  route: Route,
  orderById: Map<string, Order>,
  courierName: string,
  courierWhatsappLink: string | null = null,
): RouteView {
  return {
    id: route.id,
    courierId: route.courierId,
    courierName,
    courierWhatsappLink,
    status: route.status,
    accessToken: route.accessToken.value,
    geometry: route.geometry,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    baselineDurationSeconds: route.baselineDurationSeconds,
    savedSeconds: route.savedSeconds,
    savedMinutes: route.savedMinutes,
    createdAt: route.createdAt.toISOString(),
    startedAt: route.startedAt?.toISOString() ?? null,
    stops: route.stops.map((stop) => {
      const order = orderById.get(stop.orderId);
      return {
        id: stop.id,
        orderId: stop.orderId,
        position: stop.position,
        status: stop.status,
        etaSeconds: stop.etaSeconds,
        customerName: order?.customerName ?? '—',
        address: order?.address.raw ?? '—',
        coordinates: order?.coordinates?.toJSON() ?? null,
      };
    }),
  };
}

export async function getRoute(routeId: string) {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const route = await repos.routes.findById(routeId);
    if (!route) return null;

    const establishment = await repos.establishments.current();
    const orders = await repos.orders.findManyByIds(route.stops.map((stop) => stop.orderId));
    const couriers = await repos.couriers.list();
    // 200 posições a ~15s cobrem ~50 minutos de trajeto — o suficiente para
    // desenhar a rota percorrida sem carregar o histórico inteiro a cada
    // atualização de 10 segundos.
    const trail = await repos.pings.trail(route.id, 200);

    return {
      route: toRouteView(
        route,
        new Map(orders.map((order) => [order.id, order])),
        couriers.find((courier) => courier.id === route.courierId)?.name ?? '—',
        container.whatsapp.routeLink({
          accessToken: route.accessToken.value,
          courierWhatsapp:
            couriers.find((courier) => courier.id === route.courierId)?.phone.whatsapp ?? null,
          courierName:
            couriers.find((courier) => courier.id === route.courierId)?.name ?? '',
          stops: route.stops.length,
        }),
      ),
      establishment: {
        name: establishment.name,
        coordinates: establishment.coordinates.toJSON(),
      },
      trail: trail.map((ping) => ({ ...ping.coordinates.toJSON(), at: ping.at.toISOString() })),
    };
  });
}
