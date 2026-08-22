import 'server-only';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { containerFor } from '@/composition-root';

/**
 * Leituras dos links sem senha (motoboy e cliente).
 *
 * Estas rotas não têm sessão: o token **é** a credencial. Por isso o
 * estabelecimento é descoberto a partir do token, e só depois o container é
 * montado com o escopo daquele estabelecimento — nunca o contrário.
 */

async function establishmentIdForRoute(accessToken: string): Promise<string | null> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const route = await prisma.route.findUnique({
    where: { accessToken },
    select: { establishmentId: true },
  });
  return route?.establishmentId ?? null;
}

export interface DriverStopView {
  id: string;
  position: number;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  customerName: string;
  customerPhone: string | null;
  address: string;
  reference: string | null;
  notes: string | null;
  amountCents: number;
  etaSeconds: number;
  coordinates: { lat: number; lng: number } | null;
}

export interface DriverRouteView {
  routeId: string;
  establishmentName: string;
  courierName: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';
  startedAt: string | null;
  origin: { lat: number; lng: number };
  totalStops: number;
  stops: DriverStopView[];
}

export async function getDriverRoute(accessToken: string): Promise<DriverRouteView | null> {
  const establishmentId = await establishmentIdForRoute(accessToken);
  if (!establishmentId) return null;

  const container = containerFor(establishmentId);

  return container.read(async (repos) => {
    const prisma = getPrismaClient(env().DATABASE_URL);
    const row = await prisma.route.findUnique({
      where: { accessToken },
      include: { stops: { orderBy: { position: 'asc' } }, courier: true },
    });
    if (!row) return null;

    const establishment = await repos.establishments.current();
    const orders = await repos.orders.findManyByIds(row.stops.map((stop) => stop.orderId));
    const orderById = new Map(orders.map((order) => [order.id, order]));

    return {
      routeId: row.id,
      establishmentName: establishment.name,
      courierName: row.courier.name,
      status: row.status,
      startedAt: row.startedAt?.toISOString() ?? null,
      origin: establishment.coordinates.toJSON(),
      totalStops: row.stops.length,
      stops: row.stops.map((stop) => {
        const order = orderById.get(stop.orderId);
        return {
          id: stop.id,
          position: stop.position,
          status: stop.status,
          customerName: order?.customerName ?? '—',
          customerPhone: order?.customerPhone?.value ?? null,
          address: order?.address.raw ?? '—',
          reference: order?.address.reference ?? null,
          notes: order?.notes ?? null,
          amountCents: order?.amount.cents ?? 0,
          etaSeconds: stop.etaSeconds,
          coordinates: order?.coordinates?.toJSON() ?? null,
        };
      }),
    };
  });
}

export async function resolveRouteContext(accessToken: string) {
  const establishmentId = await establishmentIdForRoute(accessToken);
  if (!establishmentId) return null;

  const prisma = getPrismaClient(env().DATABASE_URL);
  const route = await prisma.route.findUnique({ where: { accessToken }, select: { id: true } });
  if (!route) return null;

  return { routeId: route.id, container: containerFor(establishmentId) };
}

export async function getTrackingSnapshot(trackingToken: string, recordOpen = false) {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const order = await prisma.order.findUnique({
    where: { trackingToken },
    select: { establishmentId: true },
  });
  if (!order) return null;

  return containerFor(order.establishmentId).useCases.tracking.execute(trackingToken, recordOpen);
}
