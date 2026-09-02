import {
  CourierUnavailableError,
  NotFoundError,
  type Clock,
  type MarketplaceCommandEntry,
  type Order,
  type Route,
  type UnitOfWork,
} from '@/core';

export class StartRoute {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(routeId: string): Promise<Route> {
    return this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);

      /*
       * Planejar duas levas é adiantamento; sair com as duas é impossível.
       *
       * A trava mudou de lugar: antes impedia o dono de adiantar, agora impede
       * o motoboy de estar em dois lugares — que é onde ela pertence, no
       * momento em que ele efetivamente sai.
       *
       * Só vale para rota ainda planejada. Sem essa condição, mandar iniciar
       * duas vezes a MESMA rota acusaria "motoboy em outra rota" — verdade por
       * acidente, já que a outra é ela mesma, e o dono sairia procurando um
       * problema que não existe. Deixando passar, `start` devolve o erro certo:
       * rota já iniciada.
       */
      if (
        route.status === 'PLANNED'
        && (await repos.routes.hasRouteInProgressFor(route.courierId))
      ) {
        throw new CourierUnavailableError(route.courierId);
      }

      route.start(this.clock.now());

      /*
       * Sair para entrega é um fato que a plataforma precisa saber: no iFood é
       * o `dispatch`, que muda o que o cliente vê no acompanhamento do pedido.
       * Sem isso o cliente fica olhando "em preparo" enquanto o motoboy já está
       * na rua, e liga para o restaurante perguntando.
       *
       * Enfileira aqui, junto com o início da rota — a mesma transação.
       */
      const pedidos = await Promise.all(
        route.stops.map((stop) => repos.orders.findById(stop.orderId)),
      );

      await repos.marketplace.enqueue(
        pedidos.flatMap((pedido) => avisoDeSaida(route.establishmentId, pedido)),
      );

      await repos.routes.save(route);
      await repos.events.append(route.pullEvents());

      return route;
    });
  }
}

/** Só pedido de marketplace tem para quem avisar. Ver `CompleteStop`. */
function avisoDeSaida(
  establishmentId: string,
  order: Order | null,
): MarketplaceCommandEntry[] {
  if (!order) return [];
  if (order.source !== 'IFOOD' && order.source !== 'AIQFOME') return [];
  if (!order.externalId) return [];

  return [
    {
      establishmentId,
      provider: order.source,
      externalOrderId: order.externalId,
      command: 'DISPATCH',
    },
  ];
}
