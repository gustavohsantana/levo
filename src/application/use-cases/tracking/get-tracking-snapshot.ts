import {
  NotFoundError,
  RouteStatus,
  StopStatus,
  type Clock,
  type UnitOfWork,
} from '@/core';

export interface TrackingSnapshot {
  establishmentName: string;
  customerFirstName: string;
  status: 'PREPARING' | 'ON_THE_WAY' | 'DELIVERED' | 'FAILED';
  /** Quantas entregas o motoboy ainda faz antes desta. */
  stopsAhead: number;
  estimatedArrival: string | null;
  courierPosition: { lat: number; lng: number; at: string } | null;
  destination: { lat: number; lng: number } | null;
  routeGeometry: string | null;
}

/**
 * Tudo que a página pública do cliente mostra — e **nada além disso**.
 *
 * O link circula por WhatsApp e vai parar em grupo de família, então este
 * retorno é a fronteira de privacidade do produto: sem telefone do cliente,
 * sem valor do pedido, sem nome nem contato do motoboy, sem os endereços das
 * outras entregas. Só o que responde "está chegando?".
 */
export class GetTrackingSnapshot {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(trackingToken: string): Promise<TrackingSnapshot> {
    return this.uow.run(async (repos) => {
      const order = await repos.orders.findByTrackingToken(trackingToken);
      if (!order) throw new NotFoundError('Pedido', trackingToken);

      const establishment = await repos.establishments.current();

      order.recordTrackingOpened(this.clock.now());
      await repos.events.append(order.pullEvents());

      const base = {
        establishmentName: establishment.name,
        customerFirstName: order.customerName.trim().split(/\s+/)[0],
        destination: order.coordinates?.toJSON() ?? null,
      };

      if (order.status === 'DELIVERED') {
        return { ...base, status: 'DELIVERED' as const, stopsAhead: 0, estimatedArrival: null, courierPosition: null, routeGeometry: null };
      }
      if (order.status === 'FAILED') {
        return { ...base, status: 'FAILED' as const, stopsAhead: 0, estimatedArrival: null, courierPosition: null, routeGeometry: null };
      }

      const route = order.routeId ? await repos.routes.findById(order.routeId) : null;
      if (!route || route.status !== RouteStatus.InProgress) {
        return { ...base, status: 'PREPARING' as const, stopsAhead: 0, estimatedArrival: null, courierPosition: null, routeGeometry: null };
      }

      const mine = route.stops.find((stop) => stop.orderId === order.id);
      const stopsAhead = route.stops.filter(
        (stop) => stop.status === StopStatus.Pending && stop.position < (mine?.position ?? 0),
      ).length;

      const ping = await repos.pings.lastPing(route.id);

      return {
        ...base,
        status: 'ON_THE_WAY' as const,
        stopsAhead,
        estimatedArrival:
          mine && route.startedAt ? mine.estimatedArrival(route.startedAt).toISOString() : null,
        courierPosition: ping
          ? { ...ping.coordinates.toJSON(), at: ping.at.toISOString() }
          : null,
        routeGeometry: route.geometry,
      };
    });
  }
}
