import { AggregateRoot } from './entity';

export const PaymentStatus = {
  Pending: 'PENDING',
  Paid: 'PAID',
  Expired: 'EXPIRED',
  Cancelled: 'CANCELLED',
  Refunded: 'REFUNDED',
  InReview: 'IN_REVIEW',
  Rejected: 'REJECTED',
  ChargedBack: 'CHARGED_BACK',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export type PaymentProvider = 'MERCADO_PAGO';

interface PaymentProps {
  id: string;
  establishmentId: string;
  orderId: string;
  provider: PaymentProvider;
  externalId: string;
  status: PaymentStatus;
  amountCents: number;
  qrCode: string | null;
  qrCodeBase64: string | null;
  /** Checkout Pro (cartão): URL da página do Mercado Pago. */
  checkoutUrl: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment extends AggregateRoot {
  private props: PaymentProps;

  private constructor(props: PaymentProps) {
    super(props.id);
    this.props = props;
  }

  static create(input: {
    id: string;
    establishmentId: string;
    orderId: string;
    provider: PaymentProvider;
    externalId: string;
    amountCents: number;
    qrCode?: string | null;
    qrCodeBase64?: string | null;
    checkoutUrl?: string | null;
    expiresAt?: Date | null;
    now: Date;
  }): Payment {
    return new Payment({
      id: input.id,
      establishmentId: input.establishmentId,
      orderId: input.orderId,
      provider: input.provider,
      externalId: input.externalId,
      status: PaymentStatus.Pending,
      amountCents: input.amountCents,
      qrCode: input.qrCode ?? null,
      qrCodeBase64: input.qrCodeBase64 ?? null,
      checkoutUrl: input.checkoutUrl ?? null,
      expiresAt: input.expiresAt ?? null,
      paidAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static restore(props: PaymentProps): Payment {
    return new Payment(props);
  }

  /**
   * Orders API grava PAY01…; webhook e GET /v1/payments usam o id numérico.
   * Sem isto, o pagamento cai no Mercado Pago e a tela nunca confirma.
   */
  rebindExternalId(id: string): void {
    if (!id || id === this.props.externalId) return;
    this.props.externalId = id;
  }

  /**
   * Nova tentativa no mesmo pedido (cartão recusado, token novo).
   * Não mexe em pagamento já aprovado.
   */
  reattempt(input: { externalId: string; now: Date }): void {
    if (this.props.status === PaymentStatus.Paid) return;
    this.props.externalId = input.externalId;
    this.props.status = PaymentStatus.Pending;
    this.props.paidAt = null;
    this.props.checkoutUrl = null;
    this.props.updatedAt = input.now;
  }

  markPaid(at: Date): void {
    if (this.props.status === PaymentStatus.Paid) return;
    this.props.status = PaymentStatus.Paid;
    this.props.paidAt = at;
    this.props.updatedAt = at;
  }

  markExpired(at: Date): void {
    if (this.props.status !== PaymentStatus.Pending) return;
    this.props.status = PaymentStatus.Expired;
    this.props.updatedAt = at;
  }

  markRejected(at: Date): void {
    if (this.props.status === PaymentStatus.Paid) return;
    this.props.status = PaymentStatus.Rejected;
    this.props.updatedAt = at;
  }

  markInReview(at: Date): void {
    if (this.props.status === PaymentStatus.Paid) return;
    this.props.status = PaymentStatus.InReview;
    this.props.updatedAt = at;
  }

  markChargedBack(at: Date): void {
    this.props.status = PaymentStatus.ChargedBack;
    this.props.updatedAt = at;
  }

  markRefunded(at: Date): void {
    this.props.status = PaymentStatus.Refunded;
    this.props.updatedAt = at;
  }

  get establishmentId() { return this.props.establishmentId; }
  get orderId() { return this.props.orderId; }
  get provider() { return this.props.provider; }
  get externalId() { return this.props.externalId; }
  get status() { return this.props.status; }
  get amountCents() { return this.props.amountCents; }
  get qrCode() { return this.props.qrCode; }
  get qrCodeBase64() { return this.props.qrCodeBase64; }
  get checkoutUrl() { return this.props.checkoutUrl; }
  get expiresAt() { return this.props.expiresAt; }
  get paidAt() { return this.props.paidAt; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  isPending(at: Date): boolean {
    if (this.props.status === PaymentStatus.InReview) return true;
    if (this.props.status !== PaymentStatus.Pending) return false;
    if (this.props.expiresAt && this.props.expiresAt <= at) return false;
    return true;
  }
}
