import { ExternalServiceError, PaymentStatus } from '@/core';
import type { PaymentGateway } from '@/core/ports/services';

const ORDERS_URL = 'https://api.mercadopago.com/v1/orders';
const PAYMENTS_URL = 'https://api.mercadopago.com/v1/payments';

interface MpPaymentMethod {
  id?: string;
  qr_code?: string;
  qr_code_base64?: string;
}

interface MpPayment {
  id?: string;
  status?: string;
  status_detail?: string;
  amount?: string;
  payment_method?: MpPaymentMethod;
}

interface MpOrderResponse {
  id?: string;
  status?: string;
  status_detail?: string;
  transactions?: { payments?: MpPayment[] | MpPayment };
}

function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parsePayments(body: MpOrderResponse): MpPayment | null {
  const raw = body.transactions?.payments;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export class MercadoPagoGateway implements PaymentGateway {
  async createPixCharge(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    payerEmail?: string;
    expiresInMinutes: number;
  }) {
    const amount = centsToAmount(input.amountCents);
    const expiration = `PT${input.expiresInMinutes}M`;

    const response = await fetch(ORDERS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.orderId,
      },
      body: JSON.stringify({
        type: 'online',
        processing_mode: 'automatic',
        total_amount: amount,
        external_reference: input.orderId,
        transactions: {
          payments: [{
            amount,
            payment_method: { id: 'pix', type: 'bank_transfer' },
            expiration_time: expiration,
          }],
        },
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as MpOrderResponse & {
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new ExternalServiceError(
        'Mercado Pago',
        body.message ?? body.error ?? `HTTP ${response.status}`,
        { orderId: input.orderId, status: response.status },
      );
    }

    const payment = parsePayments(body);
    const qrCode = payment?.payment_method?.qr_code;
    const externalId = payment?.id ?? body.id;

    if (!externalId || !qrCode) {
      throw new ExternalServiceError(
        'Mercado Pago',
        'Resposta sem QR Code Pix',
        { orderId: input.orderId, body },
      );
    }

    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000);

    return {
      externalId,
      qrCode,
      qrCodeBase64: payment?.payment_method?.qr_code_base64 ?? null,
      expiresAt,
    };
  }

  async getCharge(input: { accessToken: string; externalId: string }) {
    const response = await fetch(`${PAYMENTS_URL}/${input.externalId}`, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });

    const body = (await response.json().catch(() => ({}))) as {
      status?: string;
      status_detail?: string;
      transaction_amount?: number;
      date_approved?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new ExternalServiceError(
        'Mercado Pago',
        body.message ?? `HTTP ${response.status}`,
        { externalId: input.externalId, status: response.status },
      );
    }

    const status = body.status ?? '';
    const detail = body.status_detail ?? '';
    let mapped: PaymentStatus = PaymentStatus.Pending;

    if (status === 'approved') mapped = PaymentStatus.Paid;
    else if (status === 'cancelled' || status === 'expired' || detail.includes('expired')) {
      mapped = PaymentStatus.Expired;
    }

    const amountCents = Math.round((body.transaction_amount ?? 0) * 100);

    return {
      status: mapped,
      paidAt: body.date_approved ? new Date(body.date_approved) : null,
      amountCents,
    };
  }
}

export const mercadoPagoGateway = new MercadoPagoGateway();
