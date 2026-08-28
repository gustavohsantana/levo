import {
  NotFoundError,
  PaymentStatus,
  ValidationError,
  type Clock,
  type PaymentGateway,
  type UnitOfWork,
} from '@/core';

export class ConfirmPayment {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly gateway: PaymentGateway,
    private readonly clock: Clock,
    private readonly establishmentId: string,
    private readonly getAccessToken: (establishmentId: string) => Promise<string>,
  ) {}

  async execute(input: { externalId: string }): Promise<'PAID' | 'PENDING' | 'EXPIRED'> {
    const paymentRow = await this.uow.run(async (repos) => {
      const payment = await repos.payments.findByExternalId('MERCADO_PAGO', input.externalId);
      if (!payment) throw new NotFoundError('Pagamento', input.externalId);
      if (payment.establishmentId !== this.establishmentId) {
        throw new NotFoundError('Pagamento', input.externalId);
      }
      return payment;
    });

    if (paymentRow.status === PaymentStatus.Paid) return 'PAID';

    const now = this.clock.now();
    if (!paymentRow.isPending(now)) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByExternalId('MERCADO_PAGO', input.externalId);
        if (!payment || payment.status !== PaymentStatus.Pending) return;
        payment.markExpired(now);
        await repos.payments.save(payment);
      });
      return 'EXPIRED';
    }

    const accessToken = await this.getAccessToken(this.establishmentId);
    const remoto = await this.gateway.getCharge({
      accessToken,
      externalId: input.externalId,
    });

    if (remoto.amountCents !== paymentRow.amountCents) {
      throw new ValidationError('Valor pago diverge do pedido.', {
        esperado: paymentRow.amountCents,
        recebido: remoto.amountCents,
      });
    }

    if (remoto.status === PaymentStatus.Paid) {
      return this.uow.run(async (repos) => {
        const payment = await repos.payments.findByExternalId('MERCADO_PAGO', input.externalId);
        if (!payment) return 'PENDING' as const;
        if (payment.status === PaymentStatus.Paid) return 'PAID' as const;

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

    if (remoto.status === PaymentStatus.Expired) {
      await this.uow.run(async (repos) => {
        const payment = await repos.payments.findByExternalId('MERCADO_PAGO', input.externalId);
        if (!payment || payment.status !== PaymentStatus.Pending) return;
        payment.markExpired(now);
        await repos.payments.save(payment);
      });
      return 'EXPIRED';
    }

    return 'PENDING';
  }
}
