import { NotFoundError, type Clock, type UnitOfWork } from '@/core';
import type { CompleteStopInput } from '@/application/dto/schemas';

export class CompleteStop {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(routeId: string, input: CompleteStopInput): Promise<void> {
    /**
     * `occurredAt` vem do celular quando a marcação estava na fila offline.
     *
     * Guardamos o horário do toque, não o da sincronização — senão a métrica de
     * ETA fica mentindo justamente nas entregas em que a internet caiu, que são
     * as que mais interessam investigar.
     */
    const at = input.occurredAt ?? this.clock.now();

    await this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);

      const stop = route.completeStop(input.stopId, input.outcome, input.reason ?? null, at);

      const order = await repos.orders.findById(stop.orderId);
      if (!order) throw new NotFoundError('Pedido', stop.orderId);

      if (input.outcome === 'DELIVERED') order.markDelivered(at);
      else order.markFailed(input.reason ?? null, at);

      await repos.routes.save(route);
      await repos.orders.save(order);
      await repos.events.append([...route.pullEvents(), ...order.pullEvents()]);
    });
  }
}
