import {
  ConfigurationError,
  NotFoundError,
  Payment,
  ValidationError,
  type Clock,
  type IdGenerator,
  type PaymentGateway,
  type UnitOfWork,
} from '@/core';

export class CreatePayment {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly gateway: PaymentGateway,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly establishmentId: string,
    private readonly getAccessToken: (establishmentId: string) => Promise<string>,
  ) {}

  async execute(input: {
    orderId: string;
    payerEmail?: string;
    sandbox?: boolean;
    method?: 'pix' | 'card';
    description?: string;
    statementDescriptor?: string;
    backUrl?: string;
  }): Promise<Payment & { ticketUrl: string | null }> {
    const accessToken = await this.getAccessToken(this.establishmentId).catch(() => {
      throw new ConfigurationError(
        'Mercado Pago: conecte a conta do lojista em Integrações antes de cobrar online.',
        { establishmentId: this.establishmentId },
      );
    });

    const pedido = await this.uow.run(async (repos) => {
      const order = await repos.orders.findById(input.orderId);
      if (!order) throw new NotFoundError('Pedido', input.orderId);
      if (order.establishmentId !== this.establishmentId) {
        throw new NotFoundError('Pedido', input.orderId);
      }
      if (order.paymentStatus !== 'PENDING') {
        throw new ValidationError('Este pedido não aguarda pagamento online.');
      }

      const existente = await repos.payments.findByOrderId(input.orderId);
      if (existente) return { existente, order: null };

      return { existente: null, order };
    });

    if (pedido.existente) {
      return Object.assign(pedido.existente, { ticketUrl: null });
    }
    const order = pedido.order!;
    const method = input.method ?? 'pix';
    const now = this.clock.now();

    if (method === 'card') {
      const charge = await this.gateway.createCardCheckout({
        accessToken,
        orderId: input.orderId,
        amountCents: order.amount.cents,
        description: input.description ?? `Pedido ${input.orderId}`,
        payerEmail: input.payerEmail,
        statementDescriptor: input.statementDescriptor,
        backUrl: input.backUrl,
        expiresInMinutes: 60,
        sandbox: input.sandbox,
      });

      return this.uow.run(async (repos) => {
        const duplicado = await repos.payments.findByOrderId(input.orderId);
        if (duplicado) {
          return Object.assign(duplicado, { ticketUrl: null });
        }

        const payment = Payment.create({
          id: this.ids.next(),
          establishmentId: this.establishmentId,
          orderId: input.orderId,
          provider: 'MERCADO_PAGO',
          externalId: charge.externalId,
          amountCents: order.amount.cents,
          checkoutUrl: charge.checkoutUrl,
          expiresAt: charge.expiresAt,
          now,
        });

        await repos.payments.save(payment);
        return Object.assign(payment, { ticketUrl: null });
      });
    }

    const charge = await this.gateway.createPixCharge({
      accessToken,
      orderId: input.orderId,
      amountCents: order.amount.cents,
      payerEmail: input.payerEmail,
      expiresInMinutes: 30,
      sandbox: input.sandbox,
    });

    return this.uow.run(async (repos) => {
      const duplicado = await repos.payments.findByOrderId(input.orderId);
      if (duplicado) return Object.assign(duplicado, { ticketUrl: null });

      const payment = Payment.create({
        id: this.ids.next(),
        establishmentId: this.establishmentId,
        orderId: input.orderId,
        provider: 'MERCADO_PAGO',
        externalId: charge.externalId,
        amountCents: order.amount.cents,
        qrCode: charge.qrCode,
        qrCodeBase64: charge.qrCodeBase64,
        expiresAt: charge.expiresAt,
        now,
      });

      await repos.payments.save(payment);
      return Object.assign(payment, { ticketUrl: charge.ticketUrl });
    });
  }
}
