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

/**
 * Fila de marcações que não conseguiram sair.
 *
 * A internet do motoboy cai — prédio, subsolo, borda de cobertura, plano sem
 * dados no fim do mês. Sem isto, ele toca "Entregue", vê um erro vermelho e
 * volta a anotar no papel; e aí o produto morreu em campo, mesmo funcionando
 * perfeitamente no escritório.
 *
 * Guardado em IndexedDB porque precisa sobreviver ao navegador ser fechado ou
 * à aba ser descartada por falta de memória — o que acontece o tempo todo em
 * celular de entrada.
 */
export async function enqueue(item: QueuedStop): Promise<void> {
  const queue = await peek();
  queue.push(item);
  await set(KEY, queue);
}

export async function peek(): Promise<QueuedStop[]> {
  try {
    return (await get<QueuedStop[]>(KEY)) ?? [];
  } catch {
    // Navegação anônima ou armazenamento bloqueado: seguir sem fila é melhor
    // que travar a tela inteira.
    return [];
  }
}

/**
 * Tenta enviar tudo que está pendente.
 *
 * Devolve quantos saíram. O que falhar continua na fila para a próxima
 * tentativa — nada é descartado por erro de rede.
 */
export async function flush(): Promise<number> {
  const queue = await peek();
  if (queue.length === 0) return 0;

  const remaining: QueuedStop[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const response = await fetch('/api/driver/stop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      });

      // 4xx é definitivo (parada já resolvida, por exemplo): reenviar para
      // sempre só encheria a fila. 5xx e falha de rede voltam para a fila.
      if (response.ok || (response.status >= 400 && response.status < 500)) sent++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  if (remaining.length === 0) await del(KEY);
  else await set(KEY, remaining);

  return sent;
}
