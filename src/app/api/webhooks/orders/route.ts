import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ForbiddenError, type ExternalOrder, type OrderSource } from '@/core';
import { webhookOrderSchema } from '@/application/dto/schemas';
import { containerFor } from '@/composition-root';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/**
 * Porta de entrada genérica para pedidos.
 *
 * Existe porque iFood e aiqfome exigem CNPJ e homologação — que levam semanas.
 * Com este endpoint, o piloto conecta HOJE qualquer PDV, Zapier ou script que o
 * cliente já use, sem depender de credenciamento nenhum. É o que permite
 * validar o produto enquanto a homologação anda em paralelo.
 *
 * Autenticado por HMAC-SHA256 do corpo cru, no cabeçalho `x-giro-signature`.
 */
export async function POST(request: Request) {
  try {
    const secret = env().WEBHOOK_SECRET;
    if (!secret) throw new ForbiddenError('Webhook não configurado');

    const raw = await request.text();
    verifySignature(raw, request.headers.get('x-giro-signature'), secret);

    const establishmentId = request.headers.get('x-giro-establishment');
    if (!establishmentId) throw new ForbiddenError('Estabelecimento não informado');

    const prisma = getPrismaClient(env().DATABASE_URL);
    const exists = await prisma.establishment.findUnique({ where: { id: establishmentId } });
    if (!exists) throw new ForbiddenError('Estabelecimento não encontrado');

    const parsed = webhookOrderSchema.array().safeParse(normalizeBody(raw));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', issues: parsed.error.issues },
        { status: 422 },
      );
    }

    // O webhook entra pelo mesmo caso de uso das plataformas — e herda a mesma
    // idempotência de graça. Reenviar o mesmo lote é inofensivo.
    const source = new WebhookSource(
      parsed.data.map((item) => ({
        externalId: item.externalId,
        customerName: item.customerName,
        customerPhone: item.customerPhone ?? null,
        address: item.address,
        reference: item.reference ?? null,
        amountCents: item.amountCents,
        notes: item.notes ?? null,
        placedAt: item.placedAt ?? new Date(),
      })),
    );

    const result = await containerFor(establishmentId).useCases.importOrders.execute(source);

    return NextResponse.json(result, { status: 202 });
  } catch (cause) {
    return toErrorResponse(cause);
  }
}

class WebhookSource implements OrderSource {
  readonly kind = 'WEBHOOK' as const;

  constructor(private readonly orders: ExternalOrder[]) {}

  async fetchPending(): Promise<ExternalOrder[]> {
    return this.orders;
  }

  async acknowledge(): Promise<void> {
    // Não há o que confirmar: quem chamou já entregou os pedidos nesta
    // requisição, e a resposta 202 é o próprio aviso de recebimento.
  }
}

/** Aceita tanto um pedido solto quanto um lote. */
function normalizeBody(raw: string): unknown {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function verifySignature(raw: string, provided: string | null, secret: string): void {
  if (!provided) throw new ForbiddenError('Assinatura ausente');

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided.replace(/^sha256=/, ''), 'utf8');

  // Comparação em tempo constante: `a === b` vaza, pelo tempo de resposta,
  // quantos caracteres iniciais da assinatura estavam certos — o que permite
  // forjá-la byte a byte.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ForbiddenError('Assinatura inválida');
  }
}
