import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ForbiddenError } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/**
 * Entrada de eventos do iFood por webhook.
 *
 * A alternativa ao polling, e a que dispensa processo rodando 24/7: em vez de
 * perguntar de 30 em 30 segundos, o iFood avisa quando acontece. Isso é o que
 * permite a integração inteira viver em função serverless.
 *
 * O contrato tem uma exigência que não é detalhe: responder rápido. O iFood
 * espera 2xx em poucos segundos e reenvia o que não for confirmado — então o
 * trabalho pesado (buscar o pedido, geocodificar, gravar) NÃO pode acontecer
 * antes da resposta. Aqui o evento é apenas registrado; quem processa é o ciclo
 * de importação, que já sabe fazer isso de forma idempotente.
 */
export async function POST(request: Request) {
  try {
    const secret = env().IFOOD_CLIENT_SECRET;
    if (!secret) throw new ForbiddenError('Integração com o iFood não configurada');

    /*
     * O corpo CRU, sem parse.
     *
     * A assinatura cobre os bytes exatos que o iFood enviou. Serializar de
     * novo depois de um `JSON.parse` muda espaços e ordem de chaves, e a
     * verificação passa a falhar sempre — por um motivo que não aparece em
     * lugar nenhum do log.
     */
    const raw = await request.text();

    verifySignature(raw, request.headers.get('x-ifood-signature'), secret);

    const evento = JSON.parse(raw) as {
      id?: string;
      code?: string;
      orderId?: string;
      merchantId?: string;
      createdAt?: string;
    };

    /*
     * Evento de presença: o iFood dispara logo após o registro do webhook para
     * confirmar que o endereço responde. Não é pedido, não tem `orderId`.
     */
    if (!evento.orderId) {
      return NextResponse.json({ received: true });
    }

    const prisma = getPrismaClient(env().DATABASE_URL);

    const externalEventId =
      evento.id ?? `${evento.code}-${evento.orderId}-${evento.createdAt}`;

    /*
     * `upsert`, e não `create`.
     *
     * O iFood reentrega o que não recebe 200, e `externalEventId` é único — com
     * `create`, a reentrega batia na constraint e virava 500, que faz o iFood
     * reentregar de novo. Erro permanente por conta própria, e reentrega é item
     * de homologação deles.
     */
    await prisma.integrationEvent.upsert({
      where: { provider_externalEventId: { provider: 'IFOOD', externalEventId } },
      create: {
        provider: 'IFOOD',
        externalEventId,
        code: evento.code ?? 'UNKNOWN',
        externalOrderId: evento.orderId,
        merchantId: evento.merchantId ?? null,
        payload: evento,
      },
      update: { payload: evento },
    });

    return NextResponse.json({ received: true });
  } catch (cause) {
    return toErrorResponse(cause);
  }
}

function verifySignature(raw: string, provided: string | null, secret: string): void {
  if (!provided) throw new ForbiddenError('Assinatura ausente');

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided.trim().toLowerCase(), 'utf8');

  // Tempo constante: comparar com `===` vaza, pelo tempo de resposta, quantos
  // caracteres iniciais estavam certos, e permite forjar a assinatura byte a
  // byte. Rejeitar assinatura inválida é item da homologação do webhook.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ForbiddenError('Assinatura inválida');
  }
}
