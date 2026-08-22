import {
  type Clock,
  type Coordinates,
  CourierUnavailableError,
  EmptyRouteError,
  type IdGenerator,
  NotFoundError,
  OrderNotGeocodedError,
  Route,
  RouteStop,
  type RouteOptimizer,
  RouteTooLargeError,
  type RoutingService,
  type UnitOfWork,
} from '@/core';
import { baselineDuration } from '@/infrastructure/routing/baseline';

interface Input {
  courierId: string;
  orderIds: string[];
}

/** Cabe num baú de moto; acima disso a comida chega fria. */
const MAX_STOPS = 15;

export class PlanRoute {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly routing: RoutingService,
    private readonly optimizer: RouteOptimizer,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly maxStops: number = MAX_STOPS,
  ) {}

  async execute(input: Input): Promise<Route> {
    if (input.orderIds.length === 0) throw new EmptyRouteError();
    if (input.orderIds.length > this.maxStops) {
      throw new RouteTooLargeError(input.orderIds.length, this.maxStops);
    }

    // ── 1. Ler e validar (transação curta) ────────────────────────────────
    const { establishmentId, origin, orders } = await this.uow.run(async (repos) => {
      const courier = await repos.couriers.findById(input.courierId);
      if (!courier) throw new NotFoundError('Motoboy', input.courierId);
      if (!courier.active) throw new CourierUnavailableError(input.courierId);
      if (await repos.routes.hasActiveRouteFor(input.courierId)) {
        throw new CourierUnavailableError(input.courierId);
      }

      const establishment = await repos.establishments.current();
      const found = await repos.orders.findManyByIds(input.orderIds);
      const byId = new Map(found.map((order) => [order.id, order]));

      // Preserva a ordem em que o dono selecionou/recebeu os pedidos: é ela que
      // define a linha de base da comparação.
      const ordered = input.orderIds.map((id) => {
        const order = byId.get(id);
        if (!order) throw new NotFoundError('Pedido', id);
        if (!order.isGeocoded) throw new OrderNotGeocodedError(id);
        if (!order.canBeRouted) throw new OrderNotGeocodedError(id);
        return order;
      });

      return {
        establishmentId: establishment.id,
        origin: establishment.coordinates,
        orders: ordered,
      };
    });

    // ── 2. Falar com o roteirizador (fora da transação) ───────────────────
    const points: Coordinates[] = [origin, ...orders.map((order) => order.coordinates!)];
    const matrix = await this.routing.durationMatrix(points);

    /**
     * ⭐ A comparação que vende o produto.
     *
     * `baseline` é o tempo da rota na ordem em que os pedidos chegaram — o que
     * aconteceria hoje, com o maço de papéis. `optimized` é o que o Girô
     * propõe. Os dois saem da **mesma matriz**, então a comparação é honesta:
     * mesmo motor, mesmo trânsito, mesmo momento. Comparar contra uma
     * estimativa inventada daria um número maior e sem valor nenhum.
     */
    const baseline = baselineDuration(matrix);
    const optimized = this.optimizer.optimize(matrix);

    const sequence = optimized.order.map((index) => orders[index - 1]);
    const path = await this.routing.path([
      origin,
      ...sequence.map((order) => order.coordinates!),
      origin,
    ]);

    // ── 3. Persistir tudo de uma vez ──────────────────────────────────────
    return this.uow.run(async (repos) => {
      const routeId = this.ids.next();
      const now = this.clock.now();

      // ETA acumulado perna a perna: `legs[k]` é o trecho até a parada k+1.
      let elapsed = 0;
      const stops = sequence.map((order, index) => {
        const leg = path.legs[index];
        elapsed += leg?.durationSeconds ?? 0;
        return RouteStop.create({
          id: this.ids.next(),
          orderId: order.id,
          position: index + 1,
          etaSeconds: elapsed,
          legDistanceMeters: leg?.distanceMeters ?? 0,
        });
      });

      const route = Route.plan({
        id: routeId,
        establishmentId,
        courierId: input.courierId,
        stops,
        geometry: path.geometry,
        distanceMeters: path.distanceMeters,
        // Vem da matriz, não do traçado, para ficar comparável com o baseline.
        durationSeconds: Math.round(optimized.totalDurationSeconds),
        baselineDurationSeconds: Math.round(baseline),
        now,
      });

      for (const order of sequence) order.assignToRoute(routeId, now);

      await repos.routes.save(route);
      await repos.orders.saveMany(sequence);
      await repos.events.append([
        ...route.pullEvents(),
        ...sequence.flatMap((order) => order.pullEvents()),
      ]);

      return route;
    });
  }
}
