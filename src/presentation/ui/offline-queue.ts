'use client';

import { del, get, set } from 'idb-keyval';

const KEY = 'giro:fila-offline';

export interface QueuedStop {
  token: string;
  stopId: string;
  outcome: 'DELIVERED' | 'FAILED';
  reason: string | null;
  /** Horário do toque, não o da sincronização. */
  occurredAt: string;
}

export interface FlushResult {
  /** Confirmadas pelo servidor (ou definitivamente resolvidas). */
  sent: number;
  /** Ainda na fila, aguardando nova tentativa. */
  pending: number;
  /** Por que a fila não anda, quando dá para explicar ao motoboy. */
  blocked: string | null;
}

/**
 * Erros em que reenviar nunca vai adiantar.
 *
 * Tudo que NÃO estiver aqui volta para a fila. A regra anterior — "todo 4xx é
 * definitivo" — descartava silenciosamente a marcação quando a rota ainda não
 * tinha sido liberada pelo dono (409 ROUTE_NOT_ACTIVE): o motoboy via
 * "entregue" na tela e o servidor não registrava nada.
 */
const PERMANENT_CODES = new Set([
  'STOP_ALREADY_RESOLVED',
  'NOT_FOUND',
  'VALIDATION_ERROR',
]);

/**
 * Fila de marcações que não conseguiram sair.
 *
 * A internet do motoboy cai — prédio, subsolo, borda de cobertura, plano sem
 * dados no fim do mês. Sem isto, ele toca "Entregue", vê um erro vermelho e
 * volta a anotar no papel; e aí o produto morreu em campo, mesmo funcionando
 * perfeitamente no escritório.
 *
 * Guardada em IndexedDB para sobreviver ao navegador ser fechado ou à aba ser
 * descartada por falta de memória — o que acontece o tempo todo em celular de
 * entrada. Quando o IndexedDB não está disponível (aba anônima, armazenamento
 * bloqueado), cai para memória: pior, mas melhor que perder a entrega.
 */
let memoryFallback: QueuedStop[] | null = null;

export async function enqueue(item: QueuedStop): Promise<void> {
  const queue = await peek();
  queue.push(item);
  await write(queue);
}

export async function peek(): Promise<QueuedStop[]> {
  if (memoryFallback) return [...memoryFallback];

  try {
    return (await get<QueuedStop[]>(KEY)) ?? [];
  } catch {
    memoryFallback ??= [];
    return [...memoryFallback];
  }
}

async function write(queue: QueuedStop[]): Promise<void> {
  if (memoryFallback) {
    memoryFallback = queue;
    return;
  }

  try {
    if (queue.length === 0) await del(KEY);
    else await set(KEY, queue);
  } catch {
    // Armazenamento indisponível: a partir daqui a fila vive em memória. Some
    // se a aba fechar, mas nunca engole uma entrega sem avisar.
    memoryFallback = queue;
  }
}

/**
 * Tenta enviar tudo que está pendente.
 *
 * O que falhar por motivo temporário continua na fila — nada é descartado por
 * erro de rede nem por rota ainda não liberada.
 */
export async function flush(): Promise<FlushResult> {
  const queue = await peek();
  if (queue.length === 0) return { sent: 0, pending: 0, blocked: null };

  const remaining: QueuedStop[] = [];
  let sent = 0;
  let blocked: string | null = null;

  for (const item of queue) {
    try {
      const response = await fetch('/api/driver/stop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        sent++;
        continue;
      }

      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
      };

      if (body.code && PERMANENT_CODES.has(body.code)) {
        // Já resolvida no servidor: reenviar não muda nada.
        sent++;
        continue;
      }

      remaining.push(item);
      blocked ??= body.error ?? `Erro ${response.status}`;
    } catch {
      remaining.push(item);
      blocked ??= 'Sem conexão';
    }
  }

  await write(remaining);

  return { sent, pending: remaining.length, blocked };
}
