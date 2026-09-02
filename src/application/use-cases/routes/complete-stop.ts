import {
  NotFoundError,
  type Clock,
  type MarketplaceCommandEntry,
  type Order,
  type UnitOfWork,
} from '@/core';
import { conferirCodigoDeEntrega } from '@/core/services/delivery-code';
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

      if (input.outcome === 'DELIVERED') {
        /*
         * Só confere quando a loja exige. Ligar isso muda o trabalho do motoboy
         * no meio do turno, e a decisão é do dono — não um padrão que ele
         * descobre quando o entregador liga sem saber o que digitar.
         *
         * A entrega que FALHOU nunca pede código: ninguém atendeu, e exigir a
         * palavra de quem não estava lá para registrar que ele não estava é
         * absurdo.
         */
        const loja = await repos.establishments.current();
        if (loja.requireDeliveryCode) {
          conferirCodigoDeEntrega(order.deliveryCode, input.deliveryCode ?? null);
        }
        order.markDelivered(at);
      }
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

/**
   * Conclui várias paradas da mesma rota, de uma vez.
   *
   * Numa transação só, e não em chamadas repetidas: a rota fecha quando a
   * última parada resolve, e resolver uma por vez faria o `finish` competir
   * consigo mesmo. Também é o que garante o tudo-ou-nada — o dono marcou cinco
   * entregas, e não pode acabar com três marcadas e duas não.
   *
   * Existe porque nem toda entrega é confirmada pelo motoboy. Ele esquece, o
   * celular fica sem bateria, ou ele simplesmente não usa a tela — e o dono
   * precisa fechar o dia sem ligar para ele.
   */
  async executeMany(routeId: string, stopIds: string[], occurredAt?: Date): Promise<void> {
    if (stopIds.length === 0) return;

    const at = occurredAt ?? this.clock.now();

    await this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);

      /*
       * Confere todas antes de resolver qualquer uma.
       *
       * A transação já desfaz em caso de erro, mas depender só dela deixa a
       * garantia invisível — e é a garantia que importa aqui: o dono marcou
       * cinco entregas e não pode acabar com três marcadas e duas não. Falhar
       * antes de tocar em nada torna isso verdade em qualquer repositório,
       * inclusive nos testes.
       */
      const desconhecida = stopIds.find(
        (id) => !route.stops.some((stop) => stop.id === id),
      );
      if (desconhecida) throw new NotFoundError('Parada', desconhecida);

      const pedidos: Order[] = [];
      const avisos: MarketplaceCommandEntry[] = [];

      for (const stopId of stopIds) {
        const stop = route.completeStop(stopId, 'DELIVERED', null, at);

        const order = await repos.orders.findById(stop.orderId);
        if (!order) throw new NotFoundError('Pedido', stop.orderId);

        order.markDelivered(at);
        pedidos.push(order);
        avisos.push(...avisoDeEntrega(route.establishmentId, order));
      }

      await repos.marketplace.enqueue(avisos);
      await repos.routes.save(route);
      await repos.orders.saveMany(pedidos);
      await repos.events.append([
        ...route.pullEvents(),
        ...pedidos.flatMap((order) => order.pullEvents()),
      ]);
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
