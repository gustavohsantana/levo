import {
  NotFoundError,
  type Clock,
  type MarketplaceCommandEntry,
  type Order,
  type UnitOfWork,
} from '@/core';

export type Stage = 'CONFIRMED' | 'READY';

/**
 * Move o pedido pelas etapas de preparo.
 *
 * "Aceitei" e "saiu da cozinha" são decisões do lojista, não estados que o
 * sistema deduz. Elas alimentam as colunas do painel e, quando o pedido veio
 * de marketplace, viram aviso lá fora — é o que faz o cliente ver o pedido
 * andar no aplicativo dele sem ninguém dar baixa duas vezes.
 */
export class AdvanceOrderStage {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(orderId: string, stage: Stage): Promise<void> {
    await this.uow.run(async (repos) => {
      const order = await repos.orders.findById(orderId);
      if (!order) throw new NotFoundError('Pedido', orderId);

      const at = this.clock.now();

      if (stage === 'CONFIRMED') order.markConfirmed(at);
      else order.markReady(at);

      await repos.marketplace.enqueue(aviso(order, stage));
      await repos.orders.save(order);
      await repos.events.append(order.pullEvents());
    });
  }
}

/** Só pedido de marketplace tem para quem avisar. */
function aviso(order: Order, stage: Stage): MarketplaceCommandEntry[] {
  if (order.source !== 'IFOOD' && order.source !== 'AIQFOME') return [];
  if (!order.externalId) return [];

  return [
    {
      establishmentId: order.establishmentId,
      provider: order.source,
      externalOrderId: order.externalId,
      command: stage === 'CONFIRMED' ? 'CONFIRM' : 'READY',
    },
  ];
}
