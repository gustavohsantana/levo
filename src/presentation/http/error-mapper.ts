import { NextResponse } from 'next/server';
import { DomainError } from '@/core';

interface ErrorBody {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * O **único** ponto onde erro de domínio vira resposta HTTP.
 *
 * É o que permite que nenhum route handler tenha `try/catch`: o status já vem
 * na classe do erro, e o que não é `DomainError` é bug nosso — vira 500 com
 * mensagem genérica, porque detalhe de exceção interna não é assunto do cliente.
 */
export function toErrorResponse(cause: unknown): NextResponse<ErrorBody> {
  if (cause instanceof DomainError) {
    return NextResponse.json(
      { error: cause.message, code: cause.code, details: cause.details as Record<string, unknown> },
      { status: cause.httpStatus },
    );
  }

  console.error('[erro-nao-tratado]', cause);

  return NextResponse.json(
    { error: 'Erro interno. Tente novamente.', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}

/** Mensagem amigável para exibir num formulário. */
export function toFormError(cause: unknown): string {
  if (cause instanceof DomainError) return cause.message;
  console.error('[erro-nao-tratado]', cause);
  return 'Algo deu errado. Tente novamente.';
}
