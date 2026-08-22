import 'server-only';

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/**
 * Limite de tentativas por janela de tempo.
 *
 * ### Limitação honesta
 *
 * O estado vive na memória do processo. Na implantação recomendada — uma VM só,
 * rodando app e worker — isso funciona. Em serverless com várias instâncias,
 * cada uma conta separado, então o limite efetivo é multiplicado pelo número de
 * instâncias.
 *
 * Mesmo assim vale: transforma "milhares de tentativas por minuto" em "algumas
 * dezenas", que é a diferença entre uma senha fraca cair em minutos ou em
 * meses. Quando houver Redis (segundo cliente integrado, ver plano de escala),
 * o contador migra para lá sem tocar em quem chama.
 */
export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || now >= current.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;

  if (current.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Some com o contador de quem acertou a senha. */
export function clearRateLimit(key: string): void {
  windows.delete(key);
}

/**
 * Limpeza preguiçosa das janelas vencidas.
 *
 * Sem isto o Map cresce para sempre com uma entrada por e-mail já tentado — um
 * vazamento de memória lento, do tipo que só aparece semanas depois.
 */
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;

  for (const [key, window] of windows) {
    if (now >= window.resetAt) windows.delete(key);
  }
}
