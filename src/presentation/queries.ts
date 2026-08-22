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
  status: 'NEW' | 'IN_ROUTE' | 'DELIVERED' | 'FAILED';
  isGeocoded: boolean;
  coordinates: { lat: number; lng: number } | null;
  createdAt: string;
  trackingUrl: string;
  whatsappLink: string | null;
}

export interface RouteView {
  id: string;
  courierId: string;
  courierName: string;
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
    notes: order.notes,
    status: order.status,
    isGeocoded: order.isGeocoded,
    coordinates: order.coordinates?.toJSON() ?? null,
    createdAt: order.createdAt.toISOString(),
    trackingUrl,
    whatsappLink: whatsapp,
  };
}

export async function getDashboard() {
  const { session, container } = await currentContainer();

  return container.read(async (repos) => {
    const establishment = await repos.establishments.current();
    const [pending, todayOrders, activeRoutes, couriers, todayRoutes] = await Promise.all([
      repos.orders.listPending(),
      repos.orders.listOfDay(new Date()),
      repos.routes.listActive(),
      repos.couriers.list(),
      repos.routes.listOfDay(new Date()),
    ]);

    const orderById = new Map(todayOrders.map((order) => [order.id, order]));

    return {
      session,
      establishment: {
        id: establishment.id,
        name: establishment.name,
        coordinates: establishment.coordinates.toJSON(),
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
        toRouteView(route, orderById, couriers.find((c) => c.id === route.courierId)?.name ?? '—'),
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
): RouteView {
  return {
    id: route.id,
    courierId: route.courierId,
    courierName,
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
    const trail = await repos.pings.trail(route.id, 200);

    return {
      route: toRouteView(
        route,
        new Map(orders.map((order) => [order.id, order])),
        couriers.find((courier) => courier.id === route.courierId)?.name ?? '—',
      ),
      establishment: {
        name: establishment.name,
        coordinates: establishment.coordinates.toJSON(),
      },
      trail: trail.map((ping) => ({ ...ping.coordinates.toJSON(), at: ping.at.toISOString() })),
    };
  });
}
