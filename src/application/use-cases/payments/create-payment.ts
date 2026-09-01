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
    /** Token do Card Payment Brick. Sem isto, cartão ainda usa Checkout Pro. */
    card?: {
      token: string;
      installments: number;
      paymentMethodId: string;
      issuerId?: string;
      identification?: { type: string; number: string };
    };
  }): Promise<Payment & { ticketUrl: string | null }> {
    const accessToken = await this.getAccessToken(this.establishmentId).catch(() => {
      throw new ConfigurationError(
        'Mercado Pago: conecte a conta do lojista em Integrações antes de cobrar online.',
        { establishmentId: this.establishmentId },
      );
    });

    const method = input.method ?? 'pix';
    const now = this.clock.now();

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
      if (existente) {
        const novaTentativa = Boolean(input.card?.token) && existente.status !== 'PAID';
        if (novaTentativa) return { existente: null, order, renovar: null };
        if (precisaDeCodigoNovo(existente, method, now)) {
          return { existente: null, order, renovar: existente };
        }
        return { existente, order: null, renovar: null };
      }

      return { existente: null, order, renovar: null };
    });

    if (pedido.existente) {
      return Object.assign(pedido.existente, { ticketUrl: null });
    }
    const order = pedido.order!;

    if (pedido.renovar) {
      return this.renovarPix(pedido.renovar, order.amount.cents, accessToken, input, now);
    }

    if (method === 'card' && input.card?.token) {
      const charge = await this.gateway.createCardCharge({
        accessToken,
        orderId: input.orderId,
        amountCents: order.amount.cents,
        token: input.card.token,
        installments: input.card.installments,
        paymentMethodId: input.card.paymentMethodId,
        issuerId: input.card.issuerId,
        payerEmail: input.payerEmail,
        identification: input.card.identification,
        description: input.description ?? `Pedido ${input.orderId}`,
        sandbox: input.sandbox,
      });

      return this.uow.run(async (repos) => {
        const duplicado = await repos.payments.findByOrderId(input.orderId);
        if (duplicado?.status === 'PAID') {
          return Object.assign(duplicado, { ticketUrl: null });
        }

        const payment = duplicado ?? Payment.create({
          id: this.ids.next(),
          establishmentId: this.establishmentId,
          orderId: input.orderId,
          provider: 'MERCADO_PAGO',
          externalId: charge.externalId,
          amountCents: order.amount.cents,
          now,
        });

        if (duplicado) {
          duplicado.reattempt({ externalId: charge.externalId, now });
        }

        if (charge.status === 'PAID') {
          payment.markPaid(charge.paidAt ?? now);
        } else if (charge.status === 'REJECTED') {
          payment.markRejected(now);
        } else if (charge.status === 'IN_REVIEW') {
          payment.markInReview(now);
        }

        await repos.payments.save(payment);

        if (charge.status === 'PAID') {
          const pedidoPago = await repos.orders.findById(input.orderId);
          if (pedidoPago) {
            pedidoPago.markPaymentPaid(charge.paidAt ?? now);
            await repos.orders.save(pedidoPago);
            await repos.events.append(pedidoPago.pullEvents());
          }
        }

        return Object.assign(payment, { ticketUrl: null });
      });
    }

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
  /**
   * Emite um código Pix novo para um pedido cujo código morreu.
   *
   * Cancela o anterior antes de criar o próximo: enquanto não vence, a
   * cobrança antiga continua pagável, e duas vivas ao mesmo tempo deixariam o
   * cliente pagar uma que o pedido não acompanha.
   *
   * A chave de idempotência carrega o id da cobrança substituída. Assim dois
   * cliques seguidos em "gerar novo código" produzem a mesma cobrança, e não
   * duas — mas a renovação seguinte, que parte de outro código, produz outra.
   */
  private async renovarPix(
    anterior: Payment,
    amountCents: number,
    accessToken: string,
    input: { orderId: string; payerEmail?: string; sandbox?: boolean },
    now: Date,
  ): Promise<Payment & { ticketUrl: string | null }> {
    await this.gateway.cancelPixCharge({ accessToken, externalId: anterior.externalId });

    const charge = await this.gateway.createPixCharge({
      accessToken,
      orderId: input.orderId,
      amountCents,
      payerEmail: input.payerEmail,
      expiresInMinutes: 30,
      sandbox: input.sandbox,
      idempotencyKey: `${input.orderId}-apos-${anterior.externalId}`,
    });

    return this.uow.run(async (repos) => {
      const atual = await repos.payments.findByOrderId(input.orderId);
      /*
       * Relê dentro da transação: entre decidir renovar e chegar aqui, o
       * webhook pode ter confirmado o pagamento antigo. Trocar o código nesse
       * caso apagaria uma confirmação boa.
       */
      if (!atual || atual.status === 'PAID') {
        return Object.assign(atual ?? anterior, { ticketUrl: null });
      }

      atual.renovarPix({
        externalId: charge.externalId,
        qrCode: charge.qrCode,
        qrCodeBase64: charge.qrCodeBase64,
        expiresAt: charge.expiresAt,
        now,
      });
      await repos.payments.save(atual);
      return Object.assign(atual, { ticketUrl: charge.ticketUrl });
    });
  }

}

/**
 * Quanto tempo de vida ainda justifica reaproveitar o código.
 *
 * O cliente lê o QR e paga alguns segundos depois. Se o código morre nesse
 * intervalo, o dinheiro sai e volta — a pior falha possível, porque parece
 * cobrança recebida para quem pagou e não existe nada para o lojista ver.
 * Dois minutos cobrem a leitura com folga.
 */
const MARGEM_MS = 2 * 60_000;

/**
 * Um Pix vencido — ou prestes a vencer — precisa de código novo antes de ir
 * para a tela. Pagamento aprovado nunca é trocado, e cartão não entra aqui:
 * ele tem outro caminho de nova tentativa.
 */
function precisaDeCodigoNovo(
  existente: Payment,
  method: 'pix' | 'card',
  now: Date,
): boolean {
  if (method !== 'pix') return false;
  if (existente.status === 'PAID' || existente.status === 'IN_REVIEW') return false;
  if (!existente.qrCode) return false;
  const expira = existente.expiresAt;
  return expira === null || expira.getTime() - now.getTime() <= MARGEM_MS;
}
