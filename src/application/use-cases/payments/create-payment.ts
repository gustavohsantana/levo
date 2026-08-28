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
  }): Promise<Payment> {
    const accessToken = await this.getAccessToken(this.establishmentId).catch(() => {
      throw new ConfigurationError(
        'Mercado Pago: conecte a conta do lojista em Integrações antes de cobrar Pix online.',
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
        throw new ValidationError('Este pedido não aguarda pagamento Pix online.');
      }

      const existente = await repos.payments.findByOrderId(input.orderId);
      if (existente) return { existente, order: null };

      return { existente: null, order };
    });

    if (pedido.existente) return pedido.existente;
    const order = pedido.order!;

    const charge = await this.gateway.createPixCharge({
      accessToken,
      orderId: input.orderId,
      amountCents: order.amount.cents,
      payerEmail: input.payerEmail,
      expiresInMinutes: 30,
    });

    const now = this.clock.now();

    return this.uow.run(async (repos) => {
      const duplicado = await repos.payments.findByOrderId(input.orderId);
      if (duplicado) return duplicado;

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
      return payment;
    });
  }
}
