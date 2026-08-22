/**
 * Toda falha esperada do domínio herda daqui.
 *
 * O `httpStatus` mora na classe de erro — e não espalhado por route handlers —
 * para que exista **um único** ponto de tradução domínio → HTTP
 * (`presentation/http/error-mapper.ts`). Nenhum caso de uso conhece HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 422;
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;

  constructor(resource: string, id: string) {
    super(`${resource} não encontrado`, { resource, id });
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor(message = 'Credenciais inválidas') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message = 'Acesso negado') {
    super(message);
  }
}

/**
 * Falha de terceiro (OSRM, geocodificador, iFood).
 *
 * Separada das demais porque tem tratamento diferente: pode ser retentada, e
 * nunca deve virar 500 silencioso — o operador precisa saber que o problema é
 * externo, não dele.
 */
export class ExternalServiceError extends DomainError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly httpStatus = 502;

  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(`${service}: ${message}`, { service, ...details });
  }
}
