import { NextResponse } from 'next/server';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import {
  assinaturaConfere,
  dadosDoEvento,
  lerEvento,
  RESPOSTA_OK,
  respostaDeErro,
  type EventoFood99,
} from '@/infrastructure/integrations/99food/webhook-protocol';

/**
 * Entrada de eventos do 99Food por webhook.
 *
 * Mesmo desenho do webhook do iFood — anotar rápido, processar depois —, mas o
 * contrato do 99Food é mais exigente em três pontos, e os três são item de
 * homologação:
 *
 * 1. **6 segundos de teto.** Buscar o pedido, geocodificar e gravar não cabe
 *    nisso. Aqui o evento só é registrado; quem monta o pedido é o ciclo de
 *    importação, que já é idempotente.
 *
 * 2. **A resposta é `errno: 0`, não o status HTTP.** Um 200 com corpo errado
 *    conta como falha para eles, e o evento volta várias vezes.
 *
 * 3. **Erro nosso precisa responder `errno: 1`.** É o que faz o 99Food reenviar
 *    — engolir a falha com `errno: 0` perde o pedido para sempre.
 */

/*
 * Node, não Edge: a verificação de assinatura usa `node:crypto` e a gravação
 * usa o Prisma.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const appSecret = env().FOOD99_APP_SECRET;
  if (!appSecret) {
    // Sem segredo não há como provar origem, e aceitar às cegas seria abrir uma
    // porta de gravação para qualquer um.
    return NextResponse.json(respostaDeErro('99Food não configurado'), { status: 200 });
  }

  /*
   * O corpo CRU, antes de qualquer parse.
   *
   * A assinatura cobre os bytes exatos que eles enviaram, e o parse do JSON com
   * ids grandes ainda por cima reescreve número como string — reserializar
   * depois disso nunca mais bateria.
   */
  const raw = await request.text();

  if (!assinaturaConfere(raw, request.headers.get('didi-header-sign'), appSecret)) {
    /*
     * `errno: 1`, e não `errno: 0`.
     *
     * A tentação é responder "ok" para não dar a um atacante o poder de
     * provocar reenvio. Só que o 99Food reenvia apenas o que ELE mandou —
     * requisição forjada por terceiro nunca esteve na fila de retry deles, e
     * portanto não há reenvio nenhum para provocar.
     *
     * O único caso que um "ok" aqui atingiria de verdade é o pior: segredo
     * trocado ou mal configurado do nosso lado. Aí estaríamos confirmando
     * pedidos verdadeiros que não conseguimos autenticar, e eles sumiriam sem
     * deixar rastro nem aqui nem lá. Respondendo erro, o pedido continua na
     * fila deles e a falha aparece nos dois lados.
     */
    console.warn('[99food] assinatura inválida', {
      rid: requestId(request),
      tamanho: raw.length,
    });
    return NextResponse.json(respostaDeErro('assinatura inválida'), { status: 200 });
  }

  let evento: EventoFood99;
  try {
    evento = lerEvento(raw);
  } catch (cause) {
    console.error('[99food] corpo ilegível', { rid: requestId(request), cause: String(cause) });
    return NextResponse.json(respostaDeErro('corpo inválido'), { status: 200 });
  }

  const externalOrderId = idDoPedido(evento);

  /*
   * Evento sem pedido (mudança de cardápio, teste de conexão) é legítimo: só
   * não há o que importar. Confirmar é o suficiente.
   */
  if (!externalOrderId) {
    console.info('[99food] evento sem pedido', {
      rid: requestId(request),
      type: evento.type,
    });
    return NextResponse.json(RESPOSTA_OK, { status: 200 });
  }

  try {
    const prisma = getPrismaClient(env().DATABASE_URL);

    /*
     * Eles não mandam id de evento, então ele é composto. Sem um identificador
     * estável, a reentrega — que é o comportamento normal deles — viraria
     * pedido duplicado no painel.
     */
    const externalEventId = [
      evento.type ?? 'unknown',
      externalOrderId,
      evento.timestamp ?? '',
    ].join(':');

    await prisma.integrationEvent.upsert({
      where: { provider_externalEventId: { provider: 'FOOD99', externalEventId } },
      create: {
        provider: 'FOOD99',
        externalEventId,
        code: evento.type ?? 'UNKNOWN',
        externalOrderId,
        merchantId: evento.app_shop_id ?? null,
        /*
         * Guarda o request id junto do payload. A documentação pede para
         * mantê-lo: é o número que o suporte deles cobra para investigar, e
         * descobrir isso depois do incidente é tarde.
         */
        payload: { ...evento, _rid: requestId(request) } as object,
      },
      update: { payload: { ...evento, _rid: requestId(request) } as object },
    });

    return NextResponse.json(RESPOSTA_OK, { status: 200 });
  } catch (cause) {
    /*
     * Falha nossa (banco fora, por exemplo) pede reenvio — é justamente para
     * isso que o `errno: 1` existe.
     */
    console.error('[99food] falha ao registrar evento', {
      rid: requestId(request),
      cause: String(cause),
    });
    return NextResponse.json(respostaDeErro('erro ao registrar'), { status: 200 });
  }
}

/**
 * O id do pedido, venha ele no topo do evento ou dentro de `data`.
 *
 * Os ids já chegam como string do leitor que preserva bigint — converter para
 * número aqui desfaria exatamente o cuidado que a homologação exige.
 */
function idDoPedido(evento: EventoFood99): string | null {
  const dados = dadosDoEvento(evento);
  if (!dados || typeof dados !== 'object') return null;

  const d = dados as Record<string, unknown>;
  const bruto = d.order_id ?? d.orderId ?? d.order_index ?? null;

  if (bruto === null || bruto === undefined) return null;
  const id = String(bruto).trim();
  return id.length > 0 ? id : null;
}

/** O identificador da chamada, para abrir chamado com o suporte deles. */
function requestId(request: Request): string | null {
  return (
    request.headers.get('didi-header-rid') ??
    request.headers.get('x-request-id') ??
    request.headers.get('didi-header-request-id')
  );
}
