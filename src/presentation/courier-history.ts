import 'server-only';
import { Money } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import type { CourierPayAgreement } from '@/core/services/courier-pay';
import { requireCourierSession } from './http/courier-session';
import { fimDoDia, hojeEmBrasilia, inicioDoDia } from './reports-core';
import { resumirDia, type EntregaDoDia, type HistoricoDoDia } from './courier-history-core';

/**
 * O histórico de corridas do próprio motoboy — a consulta.
 *
 * Sai da sessão do entregador (`/entregador`), não do link `/m/{token}`: o link
 * é de uma rota só, e histórico atravessa rotas e dias. A sessão é a identidade
 * que persiste — e ganhos são dinheiro, então ficam atrás do login, não de um
 * link que pode ser encaminhado.
 */

type Prisma = ReturnType<typeof getPrismaClient>;

async function acordoDoMotoboy(prisma: Prisma, courierId: string): Promise<CourierPayAgreement | null> {
  const courier = await prisma.courier.findUnique({
    where: { id: courierId },
    select: {
      payModel: true,
      payPerDeliveryCents: true,
      payDailyCents: true,
      payBands: { orderBy: { uptoMeters: 'asc' }, select: { uptoMeters: true, amountCents: true } },
    },
  });
  if (!courier) return null;

  return {
    model: courier.payModel,
    perDelivery: Money.fromCents(courier.payPerDeliveryCents),
    daily: Money.fromCents(courier.payDailyCents),
    bands: courier.payBands.map((b) => ({ uptoMeters: b.uptoMeters, amount: Money.fromCents(b.amountCents) })),
  };
}

async function rotaIdsDoMotoboy(prisma: Prisma, establishmentId: string, courierId: string): Promise<string[]> {
  const rotas = await prisma.route.findMany({
    where: { establishmentId, courierId },
    select: { id: true },
  });
  return rotas.map((rota) => rota.id);
}

function paraEntrega(pedido: {
  deliveredAt: Date | null;
  createdAt: Date;
  customerName: string;
  address: string;
  amountCents: number;
  stop: { legDistanceMeters: number } | null;
}): EntregaDoDia {
  return {
    quando: (pedido.deliveredAt ?? pedido.createdAt).toISOString(),
    cliente: pedido.customerName,
    endereco: pedido.address,
    metros: pedido.stop?.legDistanceMeters ?? null,
    valorCents: pedido.amountCents,
  };
}

/** O resumo de um dia específico (padrão: hoje em Brasília), com as entregas. */
export async function historicoDoDia(dia = hojeEmBrasilia()): Promise<HistoricoDoDia> {
  const session = await requireCourierSession();
  const prisma = getPrismaClient(env().DATABASE_URL);

  const rotaIds = await rotaIdsDoMotoboy(prisma, session.establishmentId, session.courierId);
  if (rotaIds.length === 0) return resumirDia(dia, [], null);

  const pedidos = await prisma.order.findMany({
    where: {
      establishmentId: session.establishmentId,
      status: 'DELIVERED',
      routeId: { in: rotaIds },
      deliveredAt: { gte: inicioDoDia(dia), lt: fimDoDia(dia) },
    },
    orderBy: { deliveredAt: 'desc' },
    select: {
      deliveredAt: true,
      createdAt: true,
      customerName: true,
      address: true,
      amountCents: true,
      stop: { select: { legDistanceMeters: true } },
    },
  });

  const acordo = await acordoDoMotoboy(prisma, session.courierId);
  return resumirDia(dia, pedidos.map(paraEntrega), acordo);
}

/**
 * Os últimos dias em que o motoboy rodou — a lista da aba de histórico.
 *
 * Agrupado no fuso de Brasília, aqui e não no SQL: uma entrega das 22h cairia no
 * dia seguinte em UTC, e o motoboy contaria errado o próprio dia. Só dias com
 * entrega aparecem — dia parado não é linha na lista.
 */
export async function historicoRecente(limiteDeDias = 30): Promise<HistoricoDoDia[]> {
  const session = await requireCourierSession();
  const prisma = getPrismaClient(env().DATABASE_URL);

  const rotaIds = await rotaIdsDoMotoboy(prisma, session.establishmentId, session.courierId);
  if (rotaIds.length === 0) return [];

  const desde = inicioDoDia(hojeEmBrasilia());
  desde.setUTCDate(desde.getUTCDate() - (limiteDeDias - 1));

  const pedidos = await prisma.order.findMany({
    where: {
      establishmentId: session.establishmentId,
      status: 'DELIVERED',
      routeId: { in: rotaIds },
      deliveredAt: { gte: desde },
    },
    orderBy: { deliveredAt: 'desc' },
    select: {
      deliveredAt: true,
      createdAt: true,
      customerName: true,
      address: true,
      amountCents: true,
      stop: { select: { legDistanceMeters: true } },
    },
  });

  const acordo = await acordoDoMotoboy(prisma, session.courierId);

  const porDia = new Map<string, EntregaDoDia[]>();
  for (const pedido of pedidos) {
    const dia = hojeEmBrasilia(pedido.deliveredAt ?? pedido.createdAt);
    const grupo = porDia.get(dia);
    if (grupo) grupo.push(paraEntrega(pedido));
    else porDia.set(dia, [paraEntrega(pedido)]);
  }

  return [...porDia.entries()]
    .map(([dia, itens]) => resumirDia(dia, itens, acordo))
    .sort((a, b) => b.dia.localeCompare(a.dia));
}
