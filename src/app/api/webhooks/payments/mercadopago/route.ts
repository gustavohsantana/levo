import { NextResponse } from 'next/server';
import { ForbiddenError } from '@/core';
import { env } from '@/env';
import { verifyMercadoPagoWebhookSignature } from '@/infrastructure/payments/mercadopago/webhook-signature';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/**
 * Notificações de pagamento do Mercado Pago.
 *
 * Responde rápido e grava o evento — igual ao webhook do iFood. Confirmar o
 * pagamento e liberar o pedido vem depois (ConfirmPayment); aqui só registramos
 * que algo mudou no gateway.
 */
export async function GET() {
  /*
   * Abrir a URL no navegador manda GET. Sem isto o dono vê 404 ao colar o
   * endereço no painel, mesmo com a rota certa para POST.
   */
  return NextResponse.json({
    ok: true,
    endpoint: 'mercadopago-payment-webhook',
    method: 'POST',
  });
}

export async function POST(request: Request) {
  try {
    const secret = env().MERCADO_PAGO_WEBHOOK_SECRET;
    const url = new URL(request.url);
    const dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id');
    const raw = await request.text();

    if (secret) {
      verifyMercadoPagoWebhookSignature({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId,
        secret,
      });
    } else {
      console.warn('[mercadopago/webhook] MERCADO_PAGO_WEBHOOK_SECRET ausente — evento aceito sem validar');
    }

    let payload: Record<string, unknown> = {};
    if (raw) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        payload = { raw };
      }
    }

    const data = payload.data as { id?: string | number } | undefined;
    const resourceId = dataId ?? (data?.id != null ? String(data.id) : null);
    const action = typeof payload.action === 'string' ? payload.action : 'notification';
    const type = typeof payload.type === 'string' ? payload.type : 'unknown';
    const requestId = request.headers.get('x-request-id');

    const externalEventId =
      requestId ?? `${type}-${action}-${resourceId ?? 'sem-id'}-${Date.now()}`;

    if (resourceId) {
      const prisma = getPrismaClient(env().DATABASE_URL);

      await prisma.integrationEvent.create({
        data: {
          provider: 'MERCADO_PAGO',
          externalEventId,
          code: `${type}:${action}`,
          externalOrderId: resourceId,
          payload,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (cause) {
    if (cause instanceof ForbiddenError) {
      return NextResponse.json({ error: cause.message }, { status: 401 });
    }
    return toErrorResponse(cause);
  }
}
