import {
  type Clock,
  type Coordinates,
  CourierUnavailableError,
  EmptyRouteError,
  type IdGenerator,
  NotFoundError,
  OrderAlreadyRoutedError,
  OrderNotGeocodedError,
  Route,
  RouteStop,
  type RouteOptimizer,
  RouteTooLargeError,
  type RoutingService,
  type UnitOfWork,
  baselineDuration,
} from '@/core';
import { mensagemDaRota, telefoneParaWhatsApp } from '@/core/services/route-message';

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
    /** Endereço público, para montar o link do motoboy. Vazio desliga o aviso. */
    private readonly baseUrl: string = '',
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
        if (order.status !== 'NEW') throw new OrderAlreadyRoutedError(id);
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
     * aconteceria hoje, com o maço de papéis. `optimized` é o que o Levô
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
      /**
       * Revalidação dentro da transação de escrita.
       *
       * Entre a leitura do passo 1 e este momento houve duas chamadas de rede
       * ao roteirizador — segundos em que outra aba, ou o próprio dono clicando
       * duas vezes, pode ter despachado os mesmos pedidos. Sem esta recarga, os
       * dois planejamentos passariam pela validação e o pedido entraria em duas
       * rotas: uma entrega fantasma no baú de um motoboy e um cliente que nunca
       * recebe.
       *
       * As entidades relidas aqui SUBSTITUEM as do passo 1, senão gravaríamos
       * de volta o estado velho por cima do novo.
       */
      const fresh = await repos.orders.findManyByIds(sequence.map((order) => order.id));
      const freshById = new Map(fresh.map((order) => [order.id, order]));

      const confirmed = sequence.map((stale) => {
        const order = freshById.get(stale.id);
        if (!order) throw new NotFoundError('Pedido', stale.id);
        if (order.status !== 'NEW') throw new OrderAlreadyRoutedError(order.id);
        return order;
      });

      // O mesmo vale para o motoboy: ele pode ter recebido outra rota nesse meio.
      if (await repos.routes.hasActiveRouteFor(input.courierId)) {
        throw new CourierUnavailableError(input.courierId);
      }

      const routeId = this.ids.next();
      const now = this.clock.now();

      // ETA acumulado perna a perna: `legs[k]` é o trecho até a parada k+1.
      let elapsed = 0;
      const stops = confirmed.map((order, index) => {
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

      for (const order of confirmed) order.assignToRoute(routeId, now);

      await repos.routes.save(route);
      await repos.orders.saveMany(confirmed);
      await repos.events.append([
        ...route.pullEvents(),
        ...confirmed.flatMap((order) => order.pullEvents()),
      ]);

      /*
       * A mensagem entra na mesma transação da rota.
       *
       * Fora dela, uma queda entre gravar e enfileirar deixaria o motoboy com
       * uma rota que ninguém avisou. Dentro, ou as duas existem ou nenhuma —
       * e o envio em si é do worker, que pode falhar à vontade sem levar o
       * despacho junto.
       */
      if (this.baseUrl) {
        const loja = await repos.establishments.current();
        if (loja.whatsappRoutes) {
          const courier = await repos.couriers.findById(input.courierId);
          const telefone = courier ? telefoneParaWhatsApp(courier.phone.value) : null;

          if (courier && telefone) {
            await repos.courierNotifications.enqueue({
              routeId: route.id,
              phone: telefone,
              text: mensagemDaRota({
                courierName: courier.name,
                storeName: loja.name,
                stops: stops.length,
                link: `${this.baseUrl.replace(/\/$/, '')}/m/${route.accessToken}`,
              }),
            });
          }
        }
      }

      return route;
    });
  }
}
