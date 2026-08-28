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
    qrCode: string;
    qrCodeBase64: string | null;
    expiresAt: Date;
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
      qrCode: input.qrCode,
      qrCodeBase64: input.qrCodeBase64,
      expiresAt: input.expiresAt,
      paidAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static restore(props: PaymentProps): Payment {
    return new Payment(props);
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

  get establishmentId() { return this.props.establishmentId; }
  get orderId() { return this.props.orderId; }
  get provider() { return this.props.provider; }
  get externalId() { return this.props.externalId; }
  get status() { return this.props.status; }
  get amountCents() { return this.props.amountCents; }
  get qrCode() { return this.props.qrCode; }
  get qrCodeBase64() { return this.props.qrCodeBase64; }
  get expiresAt() { return this.props.expiresAt; }
  get paidAt() { return this.props.paidAt; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  isPending(at: Date): boolean {
    if (this.props.status !== PaymentStatus.Pending) return false;
    if (this.props.expiresAt && this.props.expiresAt <= at) return false;
    return true;
  }
}
