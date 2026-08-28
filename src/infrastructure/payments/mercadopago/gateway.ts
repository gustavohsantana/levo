import { ExternalServiceError, PaymentStatus } from '@/core';
import type { PaymentGateway } from '@/core/ports/services';

const ORDERS_URL = 'https://api.mercadopago.com/v1/orders';
const PAYMENTS_URL = 'https://api.mercadopago.com/v1/payments';

interface MpPaymentBody {
  id?: string | number;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  date_approved?: string;
  message?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface MpOrderResponse {
  id?: string;
  external_reference?: string;
  transactions?: {
    payments?: Array<{
      id?: string;
      payment_method?: { qr_code?: string; ticket_url?: string };
    }>;
  };
}

function centsToAmountNumber(cents: number): number {
  return Math.round(cents) / 100;
}

function isNumericPaymentId(id: string | undefined | null): boolean {
  return !!id && /^\d{8,}$/.test(id);
}

function idNumericoNoQrOuTicket(qr?: string, ticket?: string): string | null {
  const fromTicket = ticket?.match(/\/payments\/(\d{8,})/)?.[1];
  const fromQr = qr?.match(/mpqrinter(\d{8,})/)?.[1];
  return fromTicket ?? fromQr ?? null;
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

export async function resolverIdPagamentoMp(
  accessToken: string,
  resourceId: string,
): Promise<{ paymentId: string; orderId?: string }> {
  if (isNumericPaymentId(resourceId)) {
    return { paymentId: resourceId };
  }

  if (resourceId.startsWith('ORD')) {
    const response = await fetch(`${ORDERS_URL}/${resourceId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as MpOrderResponse;
    const payment = Array.isArray(body.transactions?.payments)
      ? body.transactions.payments[0]
      : undefined;
    const numerico =
      idNumericoNoQrOuTicket(payment?.payment_method?.qr_code, payment?.payment_method?.ticket_url)
      ?? (body.external_reference
        ? await buscarIdNumerico(accessToken, body.external_reference)
        : null);

    if (numerico) {
      return { paymentId: numerico, orderId: body.external_reference };
    }
  }

  return { paymentId: resourceId };
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
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000);
    const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');

    /*
     * Payments API — o id já vem numérico e o Pix do banco casa com a cobrança.
     * A Orders API gerava QR (PAY01 / reference_id curto) que o banco pagava e
     * a cobrança seguia `pending_waiting_transfer`.
     */
    const response = await fetch(PAYMENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.orderId,
      },
      body: JSON.stringify({
        transaction_amount: centsToAmountNumber(input.amountCents),
        description: `Pedido ${input.orderId}`,
        payment_method_id: 'pix',
        date_of_expiration: expiresAt.toISOString(),
        external_reference: input.orderId,
        ...(baseUrl
          ? { notification_url: `${baseUrl}/api/webhooks/payments/mercadopago` }
          : {}),
        payer: {
          email: input.payerEmail ?? `pedido-${input.orderId.slice(0, 8)}@levoentregas.app`,
          ...(input.sandbox ? { first_name: 'APRO' } : {}),
        },
      }),
    });

    const body = (await response.json().catch(() => ({}))) as MpPaymentBody & {
      error?: string;
      cause?: Array<{ description?: string; code?: string }>;
    };

    if (!response.ok) {
      const detalhe =
        body.cause?.[0]?.description
        ?? body.message
        ?? body.error
        ?? `HTTP ${response.status}`;
      throw new ExternalServiceError(
        'Mercado Pago',
        detalhe,
        { orderId: input.orderId, status: response.status, cause: body.cause },
      );
    }

    const tx = body.point_of_interaction?.transaction_data;
    const qrCode = tx?.qr_code;
    const externalId = body.id != null ? String(body.id) : null;

    if (!externalId || !isNumericPaymentId(externalId) || !qrCode) {
      throw new ExternalServiceError(
        'Mercado Pago',
        'Resposta sem QR Code Pix',
        { orderId: input.orderId, body },
      );
    }

    return {
      externalId,
      qrCode,
      qrCodeBase64: tx?.qr_code_base64 ?? null,
      ticketUrl: tx?.ticket_url ?? null,
      expiresAt,
    };
  }

  async getCharge(input: { accessToken: string; externalId: string; orderId?: string }) {
    const resolvido = await resolverIdPagamentoMp(input.accessToken, input.externalId);
    let resolvedExternalId = resolvido.paymentId;
    let consulta = isNumericPaymentId(resolvedExternalId)
      ? await lerPagamento(input.accessToken, resolvedExternalId)
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
