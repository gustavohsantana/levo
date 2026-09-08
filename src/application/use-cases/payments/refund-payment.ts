import {
  ConfigurationError,
  DomainError,
  PaymentStatus,
  type Clock,
  type Logger,
  type OrderSourceKind,
  type Payment,
  type PaymentGateway,
  type UnitOfWork,
} from '@/core';

/** Falha que o dono precisa ler na tela, não no log. */
export class RefundRefusedError extends DomainError {
  readonly code = 'REFUND_REFUSED';
  /* 409: o pagamento existe, mas o estado dele (aqui ou lá) não permite. */
  readonly httpStatus = 409;
}

export interface RefundResult {
  amountCents: number;
  /**
   * O Mercado Pago aceitou e ainda está devolvendo.
   *
   * Separado de "devolvido" porque a tela precisa dizer coisas diferentes: o
   * cliente que ligar em seguida vai perguntar se já pode olhar o extrato.
   */
  emAndamento: boolean;
}

/**
 * De onde o pedido veio determina de quem é o dinheiro.
 *
 * Pedido de marketplace foi cobrado pela plataforma, na conta dela, com as
 * regras dela — não existe pagamento do Levô para desfazer. Um botão de
 * estornar que chamasse o Mercado Pago aqui erraria de duas formas ao mesmo
 * tempo: não devolveria nada ao cliente do iFood, e poderia devolver um
 * pagamento de OUTRO pedido, se o id casasse por acidente.
 */
const NOMES_DE_FORA: Partial<Record<OrderSourceKind, string>> = {
  IFOOD: 'iFood',
  AIQFOME: 'aiqfome',
  WEBHOOK: 'outro sistema',
};

/**
 * Devolve ao cliente o pagamento online de um pedido do cardápio da loja.
 *
 * O caso concreto que criou isto: alguém pede e paga Pix às 3h da manhã, com a
 * cozinha fechada. Sem estorno no painel, a saída do dono é ligar para o
 * cliente e fazer um Pix de volta na mão — trabalho manual dentro do produto
 * que existe para eliminar trabalho manual, e sem nenhum registro de que o
 * dinheiro voltou.
 *
 * Síncrono, como o cancelamento no marketplace, e pelo mesmo motivo: a recusa
 * precisa aparecer na cara de quem clicou. Um estorno que enfileira e falha
 * meio minuto depois deixa o dono achando que resolveu — e é dinheiro.
 *
 * **O estado local só muda depois que o Mercado Pago aceita.** Marcar antes
 * seria o painel dizendo "estornado" para um dinheiro que continua na conta da
 * loja, que é a única mentira que este caso de uso não pode contar.
 */
export class RefundPayment {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
    private readonly establishmentId: string,
    private readonly getAccessToken: (establishmentId: string) => Promise<string>,
    private readonly logger?: Logger,
  ) {}

  async execute(orderId: string): Promise<RefundResult> {
    const { payment, routeId } = await this.uow.run(async (repos) => {
      const order = await repos.orders.findById(orderId);
      if (!order || order.establishmentId !== this.establishmentId) {
        throw new RefundRefusedError('Pedido não encontrado.');
      }

      const plataforma = NOMES_DE_FORA[order.source];
      if (plataforma) {
        throw new RefundRefusedError(
          `Este pedido veio do ${plataforma}: o pagamento é da plataforma, não da loja. `
            + 'Cancele por lá.',
        );
      }

      if (order.status !== 'NEW' && order.status !== 'IN_ROUTE') {
        throw new RefundRefusedError(
          'Este pedido já foi encerrado. Estorno de pedido finalizado se faz no painel do '
            + 'Mercado Pago, onde dá para conferir o que foi entregue antes de devolver.',
        );
      }

      const payment = await repos.payments.findByOrderId(orderId);
      if (!payment) {
        throw new RefundRefusedError(
          'Este pedido não tem pagamento online no Levô — não há o que estornar. '
            + 'O valor foi combinado para receber na entrega.',
        );
      }

      recusarSeNaoDaParaEstornar(payment);

      return { payment, routeId: order.routeId };
    });

    const accessToken = await this.getAccessToken(this.establishmentId).catch(() => {
      throw new ConfigurationError(
        'Mercado Pago: reconecte a conta da loja em Integrações para poder estornar.',
        { establishmentId: this.establishmentId },
      );
    });

    const estorno = await this.gateway
      .refund({ accessToken, externalId: payment.externalId, orderId })
      .catch((cause: unknown) => {
        this.logger?.error(
          { orderId, externalId: payment.externalId, cause: String(cause) },
          'pagamento.estorno_recusado',
        );

        /*
         * A mensagem do gateway sobe inteira: ela é o motivo — já estornado,
         * saldo sacado, prazo vencido — e é o que diz ao dono o que fazer
         * agora. Trocá-la por "erro ao estornar" mandaria a pessoa procurar a
         * resposta no painel do Mercado Pago.
         */
        throw new RefundRefusedError(
          cause instanceof DomainError
            ? cause.message
            : 'Não conseguimos falar com o Mercado Pago agora. O dinheiro NÃO voltou — '
              + 'tente de novo em instantes.',
          { orderId },
        );
      });

    const now = this.clock.now();

    await this.uow.run(async (repos) => {
      /*
       * Relê tudo dentro da transação: entre a decisão e a resposta do Mercado
       * Pago pode ter chegado webhook do mesmo estorno, e as entidades são
       * idempotentes justamente para este encontro.
       */
      const atual = await repos.payments.findByOrderId(orderId);
      if (atual) {
        atual.rebindExternalId(estorno.resolvedExternalId);
        atual.markRefunded(now);
        await repos.payments.save(atual);
      }

      const pedido = await repos.orders.findById(orderId);
      if (!pedido) return;

      const rota = pedido.routeId ?? routeId;
      pedido.markPaymentRefunded(now);
      await repos.orders.save(pedido);
      await repos.events.append(pedido.pullEvents());

      /*
       * Ele já estava na rua: a parada vira "não entregue" para não ficar
       * pendente para sempre na tela do motoboy, com a rota nunca fechando.
       *
       * Numa rota ainda separada e não iniciada a parada continua lá — o
       * método da rota só resolve parada de rota em andamento, e forçar isso
       * daqui mudaria também o caminho do cancelamento de marketplace. O
       * pedido, em todo caso, já saiu do painel e não entra em rota nova.
       */
      if (!rota) return;
      const route = await repos.routes.findById(rota);
      if (route?.resolveStopForOrder(orderId, 'FAILED', now)) {
        await repos.routes.save(route);
        await repos.events.append(route.pullEvents());
      }
    });

    this.logger?.info(
      { orderId, amountCents: estorno.amountCents, status: estorno.status },
      'pagamento.estornado',
    );

    return {
      /* Zero não acontece na prática; se acontecer, o valor cobrado é a melhor
       * informação disponível — e é o que o dono confere no extrato. */
      amountCents: estorno.amountCents || payment.amountCents,
      emAndamento: estorno.status === 'IN_PROCESS',
    };
  }
}

/**
 * Só se estorna o que o Levô viu entrar.
 *
 * Pedir estorno de cobrança pendente, expirada ou recusada é pedir ao Mercado
 * Pago para devolver dinheiro que nunca chegou — ele recusa, e a mensagem que
 * volta é sobre estado de recurso, não sobre o que o dono precisa saber. Vale
 * mais dizer aqui.
 */
function recusarSeNaoDaParaEstornar(payment: Payment): void {
  if (payment.status === PaymentStatus.Paid) return;

  if (payment.status === PaymentStatus.Refunded) {
    throw new RefundRefusedError('Este pagamento já foi estornado.');
  }

  if (payment.status === PaymentStatus.ChargedBack) {
    throw new RefundRefusedError(
      'Este pagamento foi contestado pelo cliente no cartão. Quem decide é o Mercado Pago, '
        + 'e o estorno por aqui não se aplica.',
    );
  }

  throw new RefundRefusedError(
    'Este pedido não tem pagamento confirmado — não há dinheiro na conta da loja para devolver.',
  );
}
