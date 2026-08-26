import {
  NotFoundError,
  type Clock,
  type MarketplaceCommandEntry,
  type Order,
  type UnitOfWork,
} from '@/core';
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

      /*
       * O pedido também existe fora daqui. Sem avisar a plataforma, o lojista
       * dá baixa duas vezes — uma no Levô, outra no aplicativo — e é o tipo de
       * trabalho dobrado que faz um sistema ser abandonado.
       *
       * Vai para a caixa de saída, dentro desta transação: ou a entrega e o
       * aviso valem juntos, ou nenhum dos dois. Entrega falha não avisa nada;
       * quem decide o que fazer com ela é o dono, não o marketplace.
       */
      if (input.outcome === 'DELIVERED') {
        await repos.marketplace.enqueue(avisoDeEntrega(route.establishmentId, order));
      }

      await repos.routes.save(route);
      await repos.orders.save(order);
      await repos.events.append([...route.pullEvents(), ...order.pullEvents()]);
    });
  }
}

/**
 * Só pedido vindo de marketplace tem para quem avisar.
 *
 * Pedido digitado à mão ou recebido por webhook genérico não tem contraparte
 * lá fora — devolve lista vazia e o `enqueue` não faz nada.
 */
function avisoDeEntrega(establishmentId: string, order: Order): MarketplaceCommandEntry[] {
  if (order.source !== 'IFOOD' && order.source !== 'AIQFOME') return [];
  if (!order.externalId) return [];

  return [
    {
      establishmentId,
      provider: order.source,
      externalOrderId: order.externalId,
      command: 'DELIVERED',
    },
  ];
}
