import 'server-only';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { requireSession } from './http/session';

/**
 * Métricas do piloto.
 *
 * Saem todas do log append-only de eventos de domínio — nenhuma instrumentação
 * paralela, nenhum contador que possa divergir da realidade. É o retorno
 * prático de gravar os eventos junto com a mudança que os gerou.
 *
 * Este painel não é do cliente: é seu. É o que você olha na segunda-feira para
 * decidir se o produto vale, o que consertar e o que vender.
 */
export interface PilotMetrics {
  windowDays: number;
  routes: number;
  ordersCreated: number;
  delivered: number;
  failed: number;

  /** ⭐ O número que vende o produto. */
  savedMinutesTotal: number;
  savedMinutesPerRoute: number;

  /** Promessa feita ao cliente final: a previsão se sustenta? */
  onTimeRate: number | null;
  medianEtaDeviationMinutes: number | null;

  /** Calcanhar de Aquiles: endereço brasileiro é bagunçado. */
  geocodeSuccessRate: number | null;

  /** Adoção real: se o motoboy não marca, o produto não entrou no fluxo dele. */
  stopsMarkedByCourier: number;

  /** O cliente final liga para o rastreio? Decide se vira destaque. */
  trackingOpensPerOrder: number | null;

  /** O gargalo operacional que estamos atacando. */
  medianMinutesToDispatch: number | null;
}

interface EventRow {
  name: string;
  payload: unknown;
  occurredAt: Date;
  aggregateId: string;
}

export async function getPilotMetrics(windowDays = 30): Promise<PilotMetrics> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const events = (await prisma.domainEventLog.findMany({
    where: { establishmentId: session.establishmentId, occurredAt: { gte: since } },
    select: { name: true, payload: true, occurredAt: true, aggregateId: true },
    orderBy: { occurredAt: 'asc' },
  })) as EventRow[];

  const by = (name: string) => events.filter((event) => event.name === name);
  const field = (event: EventRow, key: string): unknown =>
    (event.payload as Record<string, unknown> | null)?.[key];

  const planned = by('route.planned');
  const created = by('order.created');
  const geocoded = by('order.geocoded');
  const geocodeFailed = by('order.geocoding_failed');
  const stopsCompleted = by('route.stop_completed');
  const delivered = by('order.delivered');
  const failed = by('order.failed');
  const routed = by('order.routed');
  const trackingOpened = by('order.tracking_opened');

  const savedMinutesTotal = Math.round(
    planned.reduce((total, event) => total + Number(field(event, 'savedSeconds') ?? 0), 0) / 60,
  );

  const deviations = stopsCompleted
    .map((event) => Number(field(event, 'etaDeviationSeconds')))
    .filter((value) => Number.isFinite(value));

  // Tolerância de 10 min: entrega de comida não é voo, e prometer precisão de
  // minuto seria criar uma métrica que nunca fecha.
  const onTime = deviations.filter((value) => value <= 600).length;

  // Tempo entre o pedido cair e a rota sair — o gargalo que o produto ataca.
  const createdAtById = new Map(created.map((event) => [event.aggregateId, event.occurredAt]));
  const dispatchDelays = routed
    .map((event) => {
      const createdAt = createdAtById.get(event.aggregateId);
      return createdAt ? (event.occurredAt.getTime() - createdAt.getTime()) / 60_000 : null;
    })
    .filter((value): value is number => value !== null);

  const geocodeAttempts = geocoded.length + geocodeFailed.length;

  return {
    windowDays,
    routes: planned.length,
    ordersCreated: created.length,
    delivered: delivered.length,
    failed: failed.length,

    savedMinutesTotal,
    savedMinutesPerRoute: planned.length > 0 ? round1(savedMinutesTotal / planned.length) : 0,

    onTimeRate: deviations.length > 0 ? round1((onTime / deviations.length) * 100) : null,
    medianEtaDeviationMinutes:
      deviations.length > 0 ? round1(median(deviations) / 60) : null,

    // Pedidos que já entram com coordenada (via seed ou webhook) não geram
    // evento de geocodificação, então a taxa é sobre as tentativas reais.
    geocodeSuccessRate:
      geocodeAttempts > 0 ? round1((geocoded.length / geocodeAttempts) * 100) : null,

    stopsMarkedByCourier: stopsCompleted.length,

    trackingOpensPerOrder:
      created.length > 0 ? round1(trackingOpened.length / created.length) : null,

    medianMinutesToDispatch:
      dispatchDelays.length > 0 ? round1(median(dispatchDelays)) : null,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
