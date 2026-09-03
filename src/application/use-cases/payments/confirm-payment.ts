import {
  NotFoundError,
  PaymentStatus,
  ValidationError,
  type Clock,
  type PaymentGateway,
  type UnitOfWork,
} from '@/core';

export type ConfirmPaymentResult =
  | 'PAID'
  | 'PENDING'
  | 'EXPIRED'
  | 'REJECTED'
  | 'IN_REVIEW'
  | 'REFUNDED'
  | 'CHARGED_BACK';

const TERMINAL: ReadonlySet<string> = new Set([
  PaymentStatus.Expired,
  PaymentStatus.Rejected,
  PaymentStatus.Refunded,
  PaymentStatus.ChargedBack,
  PaymentStatus.Cancelled,
]);

export class ConfirmPayment {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
    private readonly establishmentId: string,
    private readonly getAccessToken: (establishmentId: string) => Promise<string>,
  ) {}

  async execute(input: { externalId: string }): Promise<ConfirmPaymentResult> {
    const paymentRow = await this.uow.run(async (repos) => {
      let payment = await repos.payments.findByExternalId('MERCADO_PAGO', input.externalId);

      /*
       * Webhook manda id numérico; Pix antigo guardou PAY01…; cartão guarda o
       * id da preferência. O GET do pagamento traz o pedido.
       */
      if (!payment) {
        const accessToken = await this.getAccessToken(this.establishmentId);
        const resposta = await fetch(
          `https://api.mercadopago.com/v1/payments/${input.externalId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            /*
             * Esta chamada acontece DENTRO da transação do Prisma, que tem teto
             * de 15s. Sem teto próprio, o Mercado Pago lento estourava a
             * transação inteira e derrubava a confirmação — que é chamada de 3
             * em 3 segundos pela tela do cliente, então várias conexões ficavam
             * retidas ao mesmo tempo.
             */
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (resposta.ok) {
          const corpo = (await resposta.json()) as { external_reference?: string };
          if (corpo.external_reference) {
            payment = await repos.payments.findByOrderId(corpo.external_reference);
          }
        }
      }

      if (!payment) throw new NotFoundError('Pagamento', input.externalId);
      if (payment.establishmentId !== this.establishmentId) {
        throw new NotFoundError('Pagamento', input.externalId);
      }
      return payment;
    });

    if (TERMINAL.has(paymentRow.status)) {
      return paymentRow.status as ConfirmPaymentResult;
    }

    const now = this.clock.now();

    /*
     * O prazo local venceu — mas quem decide se o dinheiro entrou é o gateway.
     *
     * Antes, o vencimento local fechava o pagamento como EXPIRED sem consultar
     * ninguém, e EXPIRED é terminal: nada mais reabria. O cliente que lê o QR e
     * paga aos 29min50s caía exatamente aí. O dinheiro estava na conta do
     * lojista, e o pedido nunca era liberado para a cozinha.
     *
     * Agora o vencimento só decide o que fazer DEPOIS da resposta do Mercado
     * Pago, lá embaixo. Se a consulta falhar, este caso de uso lança e o pedido
     * segue pendente — a próxima rodada da reconciliação tenta de novo. Ficar
     * pendente por engano custa uma consulta; expirar por engano custa a venda.
     */
    const prazoVencido = paymentRow.status !== PaymentStatus.Paid && !paymentRow.isPending(now);

    const accessToken = await this.getAccessToken(this.establishmentId);
    const remoto = await this.gateway.getCharge({
      accessToken,
      externalId: input.externalId,
      orderId: paymentRow.orderId,
    });

    if (
      remoto.status === PaymentStatus.Paid
      && remoto.amountCents > 0
      && remoto.amountCents !== paymentRow.amountCents
    ) {
      throw new ValidationError('Valor pago diverge do pedido.', {
        esperado: paymentRow.amountCents,
        recebido: remoto.amountCents,
      });
    }

    if (remoto.status === PaymentStatus.Paid) {
      return this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment) return 'PENDING' as const;
        if (payment.status === PaymentStatus.Paid) return 'PAID' as const;

        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markPaid(remoto.paidAt ?? now);
        await repos.payments.save(payment);

        const order = await repos.orders.findById(payment.orderId);
        if (order) {
          order.markPaymentPaid(now);
          await repos.orders.save(order);
          await repos.events.append(order.pullEvents());
        }

        return 'PAID' as const;
      });
    }

    if (remoto.status === PaymentStatus.ChargedBack) {
      return this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment) return 'PENDING' as const;
        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markChargedBack(now);
        await repos.payments.save(payment);

        const order = await repos.orders.findById(payment.orderId);
        if (order) {
          order.markPaymentChargedBack(now);
          await repos.orders.save(order);
          await repos.events.append(order.pullEvents());
        }

        return 'CHARGED_BACK' as const;
      });
    }

    if (remoto.status === PaymentStatus.Refunded) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment) return;
        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markRefunded(now);
        await repos.payments.save(payment);

        const order = await repos.orders.findById(payment.orderId);
        if (order) {
          order.markPaymentStatus(PaymentStatus.Refunded);
          await repos.orders.save(order);
        }
      });
      return 'REFUNDED';
    }

    if (remoto.status === PaymentStatus.Rejected) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment || payment.status === PaymentStatus.Paid) return;
        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markRejected(now);
        await repos.payments.save(payment);

        const order = await repos.orders.findById(payment.orderId);
        if (order) {
          order.markPaymentStatus(PaymentStatus.Rejected);
          await repos.orders.save(order);
        }
      });
      return 'REJECTED';
    }

    if (remoto.status === PaymentStatus.InReview) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment || payment.status === PaymentStatus.Paid) return;
        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markInReview(now);
        await repos.payments.save(payment);

        const order = await repos.orders.findById(payment.orderId);
        if (order) {
          order.markPaymentStatus(PaymentStatus.InReview);
          await repos.orders.save(order);
        }
      });
      return 'IN_REVIEW';
    }

    if (remoto.status === PaymentStatus.Expired) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment || payment.status !== PaymentStatus.Pending) return;
        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markExpired(now);
        await repos.payments.save(payment);
      });
      return 'EXPIRED';
    }

    /*
     * Agora sim: o prazo venceu E o Mercado Pago confirma que não entrou.
     *
     * Esta é a mesma conclusão de antes — só que tomada depois de perguntar, e
     * não no lugar de perguntar. É a diferença entre fechar uma cobrança morta e
     * fechar uma cobrança que acabou de ser paga.
     */
    if (prazoVencido) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByOrderId(paymentRow.orderId);
        if (!payment || payment.status !== PaymentStatus.Pending) return;
        payment.rebindExternalId(remoto.resolvedExternalId);
        payment.markExpired(now);
        await repos.payments.save(payment);
      });
      return 'EXPIRED';
    }

    await this.uow.run(async (repos) => {
      const payment = await repos.payments.findByOrderId(paymentRow.orderId);
      if (!payment || payment.externalId === remoto.resolvedExternalId) return;
      payment.rebindExternalId(remoto.resolvedExternalId);
      await repos.payments.save(payment);
    });

    return paymentRow.status === PaymentStatus.Paid ? 'PAID' : 'PENDING';
  }
}
