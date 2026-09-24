import 'server-only';
import { Money } from '@/core';
import type { CourierPayAgreement } from '@/core/services/courier-pay';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { containerFor } from '@/composition-root';
import {
  montarHistoricoDoDia,
  type EntregaConcluida,
  type HistoricoDoDia,
} from './historico-do-motoboy';
import { fimDoDia, hojeEmBrasilia, inicioDoDia } from './reports-core';

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
  /** A loja exige o código do cliente para fechar a entrega. */
  exigeCodigo: boolean;
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
      exigeCodigo: establishment.requireDeliveryCode,
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

/**
 * Entregas que este motoboy concluiu hoje, e a soma do que tem a receber.
 *
 * "Hoje" é o dia de Brasília, o mesmo do acerto da loja. A conclusão é
 * `deliveredAt` — o toque em Entreguei, inclusive o que ficou na fila offline —
 * e não a hora em que o pedido foi lançado.
 */
export async function historicoDeHoje(
  establishmentId: string,
  courierId: string,
  agora = new Date(),
): Promise<HistoricoDoDia> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const hoje = hojeEmBrasilia(agora);

  const [courier, pedidos] = await Promise.all([
    prisma.courier.findFirst({
      where: { id: courierId, establishmentId },
      select: {
        payModel: true,
        payPerDeliveryCents: true,
        payDailyCents: true,
        payBands: {
          orderBy: { uptoMeters: 'asc' },
          select: { uptoMeters: true, amountCents: true },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        establishmentId,
        status: 'DELIVERED',
        deliveredAt: { gte: inicioDoDia(hoje), lt: fimDoDia(hoje) },
        stop: { route: { courierId, establishmentId } },
      },
      select: {
        id: true,
        customerName: true,
        address: true,
        deliveredAt: true,
        stop: { select: { legDistanceMeters: true } },
      },
      orderBy: { deliveredAt: 'desc' },
    }),
  ]);

  const entregas: EntregaConcluida[] = [];
  for (const pedido of pedidos) {
    if (!pedido.deliveredAt) continue;
    entregas.push({
      id: pedido.id,
      cliente: pedido.customerName,
      endereco: pedido.address,
      quando: pedido.deliveredAt.toISOString(),
      metros: pedido.stop?.legDistanceMeters ?? 0,
    });
  }

  return montarHistoricoDoDia(entregas, acordoDoCourier(courier), agora);
}

/** O histórico de quem está neste link. `null` se o token não é de rota nenhuma. */
export async function historicoDeHojePeloToken(
  accessToken: string,
): Promise<HistoricoDoDia | null> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const rota = await prisma.route.findUnique({
    where: { accessToken },
    select: { courierId: true, establishmentId: true },
  });
  if (!rota) return null;
  return historicoDeHoje(rota.establishmentId, rota.courierId);
}

function acordoDoCourier(
  courier: {
    payModel: CourierPayAgreement['model'];
    payPerDeliveryCents: number;
    payDailyCents: number;
    payBands: Array<{ uptoMeters: number; amountCents: number }>;
  } | null,
): CourierPayAgreement {
  if (!courier) {
    return {
      model: 'POR_ENTREGA',
      perDelivery: Money.fromCents(0),
      daily: Money.fromCents(0),
      bands: [],
    };
  }

  return {
    model: courier.payModel,
    perDelivery: Money.fromCents(courier.payPerDeliveryCents),
    daily: Money.fromCents(courier.payDailyCents),
    bands: courier.payBands.map((faixa) => ({
      uptoMeters: faixa.uptoMeters,
      amount: Money.fromCents(faixa.amountCents),
    })),
  };
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
