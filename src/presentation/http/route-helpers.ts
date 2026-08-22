import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { ValidationError } from '@/core';
import { toErrorResponse } from './error-mapper';

/**
 * Envelope de rota: valida a entrada, chama o handler e traduz qualquer erro.
 *
 * Existe para que nenhum handler repita o mesmo bloco de parse + try/catch —
 * era o trecho que mais se duplicava em cada arquivo de rota.
 */
export function withValidation<T extends z.ZodType>(
  schema: T,
  handler: (input: z.infer<T>, request: Request) => Promise<NextResponse>,
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const body = await request.json().catch(() => {
        throw new ValidationError('Corpo da requisição não é um JSON válido');
      });

      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? 'Dados inválidos', {
          issues: parsed.error.issues,
        });
      }

      return await handler(parsed.data, request);
    } catch (cause) {
      return toErrorResponse(cause);
    }
  };
}

export function handle(handler: () => Promise<NextResponse>) {
  return async (): Promise<NextResponse> => {
    try {
      return await handler();
    } catch (cause) {
      return toErrorResponse(cause);
    }
  };
}
