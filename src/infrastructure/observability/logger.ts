import pino from 'pino';
import type { Logger } from '@/core';

/**
 * Log estruturado.
 *
 * Sempre em JSON com campos nomeados, nunca string concatenada: num piloto,
 * "por que aquele pedido das 20h47 não entrou na rota?" precisa ser uma
 * consulta, não uma leitura de log linha a linha.
 */
export function createLogger(level: string, pretty: boolean): Logger {
  const instance = pino({
    level,
    ...(pretty
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }
      : {}),
  });

  return {
    info: (payload, message) => instance.info(payload, message),
    warn: (payload, message) => instance.warn(payload, message),
    error: (payload, message) => instance.error(payload, message),
  };
}
