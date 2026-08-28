import { ExternalServiceError, PaymentStatus } from '@/core';
import type { PaymentGateway } from '@/core/ports/services';

const ORDERS_URL = 'https://api.mercadopago.com/v1/orders';
const PAYMENTS_URL = 'https://api.mercadopago.com/v1/payments';

interface MpPaymentMethod {
  id?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

interface MpPayment {
  id?: string;
  /** Id interno da Orders API — não serve em GET /v1/payments. */
  reference_id?: string | number;
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

interface MpPaymentBody {
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  date_approved?: string;
  message?: string;
}

function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parsePayments(body: MpOrderResponse): MpPayment | null {
  const raw = body.transactions?.payments;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/** GET /v1/payments/{id} só aceita o id numérico longo. */
function isNumericPaymentId(id: string | undefined | null): id is string {
  return !!id && /^\d{8,}$/.test(id);
}

function idNumericoNaResposta(payment: MpPayment | null, body: MpOrderResponse): string | null {
  const ticket = payment?.payment_method?.ticket_url;
  const fromTicket = ticket?.match(/\/payments\/(\d{8,})/)?.[1];
  const fromQr = payment?.payment_method?.qr_code?.match(/mpqrinter(\d{8,})/)?.[1];

  for (const candidate of [payment?.id, body.id, fromTicket, fromQr]) {
    if (isNumericPaymentId(candidate != null ? String(candidate) : null)) {
      return String(candidate);
    }
  }

  return null;
}

async function buscarIdNumerico(
  accessToken: string,
  orderId: string,
): Promise<string | null> {
  const response = await fetch(
    `${PAYMENTS_URL}/search?external_reference=${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const body = (await response.json().catch(() => ({}))) as {
    results?: Array<{ id?: string | number }>;
  };

  const id = body.results?.[0]?.id;
  return id != null ? String(id) : null;
}

async function lerPagamento(
  accessToken: string,
  externalId: string,
): Promise<{ ok: boolean; status: number; body: MpPaymentBody }> {
  const response = await fetch(`${PAYMENTS_URL}/${externalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const body = (await response.json().catch(() => ({}))) as MpPaymentBody;
  return { ok: response.ok, status: response.status, body };
}

export class MercadoPagoGateway implements PaymentGateway {
  async createPixCharge(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    payerEmail?: string;
    expiresInMinutes: number;
    sandbox?: boolean;
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
        payer: input.payerEmail
          ? {
              email: input.payerEmail,
              ...(input.sandbox ? { first_name: 'APRO' } : {}),
            }
          : undefined,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as MpOrderResponse & {
      message?: string;
      error?: string;
      errors?: Array<{ message?: string; code?: string }>;
    };

    if (!response.ok) {
      const detalhe =
        body.errors?.[0]?.message
        ?? body.message
        ?? body.error
        ?? `HTTP ${response.status}`;
      throw new ExternalServiceError(
        'Mercado Pago',
        detalhe,
        { orderId: input.orderId, status: response.status, errors: body.errors },
      );
    }

    const payment = parsePayments(body);
    const qrCode = payment?.payment_method?.qr_code;

    let externalId = idNumericoNaResposta(payment, body);
    if (!externalId) {
      externalId = await buscarIdNumerico(input.accessToken, input.orderId);
    }

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
      ticketUrl: payment?.payment_method?.ticket_url ?? null,
      expiresAt,
    };
  }

  async getCharge(input: { accessToken: string; externalId: string; orderId?: string }) {
    let resolvedExternalId = input.externalId;
    let consulta = isNumericPaymentId(input.externalId)
      ? await lerPagamento(input.accessToken, input.externalId)
      : { ok: false, status: 404, body: {} as MpPaymentBody };

    if (!consulta.ok && input.orderId) {
      const numerico = await buscarIdNumerico(input.accessToken, input.orderId);
      if (numerico) {
        resolvedExternalId = numerico;
        consulta = await lerPagamento(input.accessToken, numerico);
      }
    }

    const { ok, status, body } = consulta;

    if (!ok) {
      throw new ExternalServiceError(
        'Mercado Pago',
        'Não foi possível consultar o pagamento. Tente de novo em instantes.',
        { externalId: input.externalId, status },
      );
    }

    const mappedStatus = body.status ?? '';
    const detail = body.status_detail ?? '';
    let mapped: PaymentStatus = PaymentStatus.Pending;

    if (mappedStatus === 'approved') mapped = PaymentStatus.Paid;
    else if (mappedStatus === 'cancelled' || mappedStatus === 'expired' || detail.includes('expired')) {
      mapped = PaymentStatus.Expired;
    }

    const amountCents = Math.round((body.transaction_amount ?? 0) * 100);

    return {
      status: mapped,
      paidAt: body.date_approved ? new Date(body.date_approved) : null,
      amountCents,
      resolvedExternalId,
    };
  }
}

export const mercadoPagoGateway = new MercadoPagoGateway();
