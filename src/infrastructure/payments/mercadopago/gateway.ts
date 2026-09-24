import { ExternalServiceError, PaymentStatus } from '@/core';
import type { PaymentGateway } from '@/core/ports/services';

const ORDERS_URL = 'https://api.mercadopago.com/v1/orders';
/**
 * Teto para toda chamada ao Mercado Pago.
 *
 * Era a única integração do sistema sem nenhum — OSRM, Nominatim, iFood, CEP e
 * o próprio OAuth do MP já tinham. Sem teto, um gateway degradado numa noite de
 * sábado pendura a tela do cliente até o limite da plataforma, e cada tentativa
 * presa segura uma conexão do banco: o painel inteiro começa a arrastar
 * justamente quando mais gente está pagando.
 *
 * Dez segundos: cobrança é operação síncrona, com alguém olhando a tela — além
 * disso a pessoa já desistiu.
 */
const TIMEOUT_MS = 10_000;

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

export function mapMercadoPagoStatus(status: string, detail = ''): PaymentStatus {
  if (status === 'approved') return PaymentStatus.Paid;
  if (status === 'refunded') return PaymentStatus.Refunded;
  if (status === 'charged_back') return PaymentStatus.ChargedBack;
  if (status === 'rejected') return PaymentStatus.Rejected;
  if (
    status === 'in_process'
    || status === 'in_mediation'
    || detail.includes('pending_contingency')
    || detail.includes('pending_review')
  ) {
    return PaymentStatus.InReview;
  }
  if (status === 'cancelled' || status === 'expired' || detail.includes('expired')) {
    return PaymentStatus.Expired;
  }
  return PaymentStatus.Pending;
}

function centsToAmountNumber(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * O Mercado Pago recusa `notification_url` que não seja https. Em localhost
 * (http://localhost:3000) mandar o campo faz a cobrança inteira falhar — o
 * mesmo erro do Pix. Cartão na tela não precisa do webhook para confirmar:
 * a Payments API já devolve approved/rejected na hora.
 */
function webhookHttps(): string | undefined {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!base?.startsWith('https://')) return undefined;
  return `${base}/api/webhooks/payments/mercadopago`;
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
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
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
    signal: AbortSignal.timeout(TIMEOUT_MS),
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
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

/**
 * O "não" do Mercado Pago em português, sem inventar um "sim".
 *
 * Um estorno recusado tem sempre um motivo concreto — já estornado, saldo
 * sacado, prazo vencido — e é ele que diz ao dono o que fazer em seguida.
 * "Erro ao estornar" mandaria a pessoa abrir o painel do Mercado Pago para
 * descobrir o que esta resposta já disse.
 *
 * O que não reconhecemos vai inteiro para a tela. A API muda mensagem sem
 * avisar, e uma frase estranha em inglês ainda é melhor do que engolir a única
 * pista que existe.
 */
function motivoDaRecusa(
  body: {
    message?: string;
    error?: string;
    status?: string;
    cause?: Array<{ description?: string; code?: string | number }>;
  },
  httpStatus: number,
): string {
  const detalhe =
    body.cause?.[0]?.description
    ?? body.message
    ?? body.error
    ?? (body.status ? `estorno ${body.status}` : `HTTP ${httpStatus}`);

  const texto = detalhe.toLowerCase();

  if (texto.includes('already refunded') || texto.includes('already_refunded')) {
    return 'este pagamento já foi estornado.';
  }
  if (texto.includes('unavailable_funds') || texto.includes('insufficient')) {
    return 'a conta da loja não tem saldo para devolver — o valor já foi sacado. '
      + 'Reponha o saldo e estorne pelo painel do Mercado Pago.';
  }
  if (texto.includes('expired') || texto.includes('period')) {
    return 'o prazo de estorno deste pagamento já venceu.';
  }
  if (texto.includes('not found') || httpStatus === 404) {
    return 'não encontrei este pagamento na conta da loja.';
  }
  if (texto.includes('status')) {
    return `o pagamento não está em estado que aceite estorno (${detalhe}).`;
  }

  return `o estorno foi recusado (${detalhe}).`;
}

export class MercadoPagoGateway implements PaymentGateway {
  async createPixCharge(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    payerEmail?: string;
    expiresInMinutes: number;
    sandbox?: boolean;
    idempotencyKey?: string;
  }) {
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000);
    const webhook = webhookHttps();

    /*
     * Payments API — o id já vem numérico. Sem `point_of_interaction: CHECKOUT`
     * o MP grava o Pix como OPENPLATFORM: o banco lê o QR, mas a cobrança
     * fica `pending_waiting_transfer` e depois estorna. CHECKOUT é o mesmo
     * canal do cartão na tela.
     */
    const response = await fetch(PAYMENTS_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey ?? input.orderId,
      },
      body: JSON.stringify({
        transaction_amount: centsToAmountNumber(input.amountCents),
        description: `Pedido ${input.orderId}`,
        payment_method_id: 'pix',
        date_of_expiration: expiresAt.toISOString(),
        external_reference: input.orderId,
        point_of_interaction: { type: 'CHECKOUT' },
        ...(webhook ? { notification_url: webhook } : {}),
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

  /**
   * Cancela a cobrança para que só exista um código pagável por pedido.
   *
   * Não derruba o fluxo: cobrança já vencida ou já cancelada responde 4xx, e
   * aí o objetivo — ela não receber mais dinheiro — já está cumprido. Emitir o
   * código novo importa mais do que confirmar a morte do antigo.
   */
  async cancelPixCharge(input: { accessToken: string; externalId: string }): Promise<void> {
    await fetch(`${PAYMENTS_URL}/${input.externalId}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `cancel-${input.externalId}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    }).catch(() => undefined);
  }

  async createCardCheckout(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    description: string;
    payerEmail?: string;
    statementDescriptor?: string;
    backUrl?: string;
    expiresInMinutes: number;
    sandbox?: boolean;
  }) {
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000);
    const webhook = webhookHttps();
    const backUrl = input.backUrl?.startsWith('https://') ? input.backUrl : undefined;

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `card-${input.orderId}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: input.orderId,
            title: input.description.slice(0, 127) || 'Pedido',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: centsToAmountNumber(input.amountCents),
          },
        ],
        payer: {
          email: input.payerEmail ?? `pedido-${input.orderId.slice(0, 8)}@levoentregas.app`,
        },
        external_reference: input.orderId,
        binary_mode: true,
        statement_descriptor: (input.statementDescriptor ?? 'LEVO').slice(0, 22),
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'atm' }],
          installments: 12,
          default_installments: 1,
        },
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: expiresAt.toISOString(),
        ...(webhook ? { notification_url: webhook } : {}),
        ...(backUrl
          ? {
              back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
              auto_return: 'approved',
            }
          : {}),
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
      error?: string;
      cause?: Array<{ description?: string }>;
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

    const checkoutUrl = input.sandbox
      ? (body.sandbox_init_point ?? body.init_point)
      : (body.init_point ?? body.sandbox_init_point);

    if (!body.id || !checkoutUrl) {
      throw new ExternalServiceError(
        'Mercado Pago',
        'Resposta sem link de pagamento no cartão',
        { orderId: input.orderId, body },
      );
    }

    return { externalId: body.id, checkoutUrl, expiresAt };
  }

  async createCardCharge(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: string;
    payerEmail?: string;
    identification?: { type: string; number: string };
    description?: string;
    sandbox?: boolean;
  }) {
    const webhook = webhookHttps();
    const idempotency = `card-${input.orderId}-${input.token.slice(0, 24)}`;
    const documento = input.identification?.number.replace(/\D/g, '') ?? '';

    const response = await fetch(PAYMENTS_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotency,
      },
      body: JSON.stringify({
        transaction_amount: centsToAmountNumber(input.amountCents),
        token: input.token,
        description: (input.description ?? `Pedido ${input.orderId}`).slice(0, 127),
        installments: input.installments,
        payment_method_id: input.paymentMethodId,
        ...(input.issuerId ? { issuer_id: input.issuerId } : {}),
        binary_mode: true,
        external_reference: input.orderId,
        ...(webhook ? { notification_url: webhook } : {}),
        payer: {
          email: input.payerEmail ?? `pedido-${input.orderId.slice(0, 8)}@levoentregas.app`,
          ...(input.identification && documento
            ? { identification: { type: input.identification.type, number: documento } }
            : {}),
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

    const externalId = body.id != null ? String(body.id) : null;
    if (!externalId || !isNumericPaymentId(externalId)) {
      throw new ExternalServiceError(
        'Mercado Pago',
        'Resposta sem id de pagamento no cartão',
        { orderId: input.orderId, body },
      );
    }

    return {
      externalId,
      status: mapMercadoPagoStatus(body.status ?? '', body.status_detail ?? ''),
      paidAt: body.date_approved ? new Date(body.date_approved) : null,
    };
  }

  /**
   * `POST /v1/payments/{id}/refunds` com corpo vazio — que é como a API do
   * Mercado Pago diz "devolve tudo". Mandar `amount` igual ao total daria no
   * mesmo para ela e abriria a porta para estorno parcial entrar por descuido.
   *
   * O id precisa ser o numérico do pagamento. O banco pode ter guardado
   * `PAY01…`/`ORD01…` do tempo da Orders API, ou o id da preferência do
   * Checkout Pro, e nenhum dos dois aceita `/refunds`.
   */
  async refund(input: { accessToken: string; externalId: string; orderId?: string }) {
    const id = await this.idNumericoPara(input);

    const response = await fetch(`${PAYMENTS_URL}/${id}/refunds`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        /*
         * Derivada do pagamento, e não sorteada: dois cliques em "estornar"
         * devolvem o mesmo estorno em vez de tentarem devolver duas vezes.
         */
        'X-Idempotency-Key': `refund-${id}`,
      },
      body: JSON.stringify({}),
    });

    const body = (await response.json().catch(() => ({}))) as {
      id?: string | number;
      amount?: number;
      status?: string;
      date_created?: string;
      message?: string;
      error?: string;
      cause?: Array<{ description?: string; code?: string | number }>;
    };

    if (!response.ok) {
      throw new ExternalServiceError('Mercado Pago', motivoDaRecusa(body, response.status), {
        externalId: id,
        status: response.status,
        cause: body.cause,
      });
    }

    /*
     * 200 com estorno recusado existe: a API responde o recurso criado com
     * `status: rejected` quando a conta não tem saldo para devolver. Tratar
     * como sucesso diria ao dono que o dinheiro voltou.
     */
    if (body.status === 'rejected' || body.status === 'cancelled') {
      throw new ExternalServiceError('Mercado Pago', motivoDaRecusa(body, response.status), {
        externalId: id,
        refundStatus: body.status,
      });
    }

    return {
      status: body.status === 'in_process' ? ('IN_PROCESS' as const) : ('APPROVED' as const),
      amountCents: Math.round((body.amount ?? 0) * 100),
      refundedAt: body.date_created ? new Date(body.date_created) : new Date(),
      resolvedExternalId: id,
    };
  }

  /**
   * O id numérico daquele pagamento, custe uma chamada a mais.
   *
   * Mesma escada do `getCharge`: tenta resolver o que veio, e cai na busca por
   * `external_reference` quando o que está guardado não é um pagamento.
   */
  private async idNumericoPara(input: {
    accessToken: string;
    externalId: string;
    orderId?: string;
  }): Promise<string> {
    const resolvido = await resolverIdPagamentoMp(input.accessToken, input.externalId);
    if (isNumericPaymentId(resolvido.paymentId)) return resolvido.paymentId;

    const referencia = input.orderId ?? resolvido.orderId;
    const numerico = referencia
      ? await buscarIdNumerico(input.accessToken, referencia)
      : null;

    if (!numerico) {
      throw new ExternalServiceError(
        'Mercado Pago',
        'Não encontrei o pagamento deste pedido para estornar. Confira no painel do Mercado Pago.',
        { externalId: input.externalId, orderId: input.orderId },
      );
    }

    return numerico;
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
      if (status === 404) {
        return {
          status: PaymentStatus.Pending,
          paidAt: null,
          amountCents: 0,
          resolvedExternalId: resolvedExternalId,
        };
      }

      throw new ExternalServiceError(
        'Mercado Pago',
        'Não foi possível consultar o pagamento. Tente de novo em instantes.',
        { externalId: input.externalId, status },
      );
    }

    const amountCents = Math.round((body.transaction_amount ?? 0) * 100);

    return {
      status: mapMercadoPagoStatus(body.status ?? '', body.status_detail ?? ''),
      paidAt: body.date_approved ? new Date(body.date_approved) : null,
      amountCents,
      resolvedExternalId,
    };
  }
}

export const mercadoPagoGateway = new MercadoPagoGateway();
