import { ConflictError, ValidationError } from './domain-error';

export class EmptyRouteError extends ValidationError {
  constructor() {
    super('Uma rota precisa de pelo menos um pedido');
  }
}

export class RouteTooLargeError extends ValidationError {
  constructor(count: number, max: number) {
    super(`Rota com ${count} paradas excede o máximo de ${max}`, { count, max });
  }
}

export class RouteAlreadyStartedError extends ConflictError {
  constructor(routeId: string) {
    super('Rota já foi iniciada', { routeId });
  }
}

export class RouteNotActiveError extends ConflictError {
  /**
   * Código próprio porque a fila offline do motoboy precisa distinguir dois
   * tipos de 409: este é TEMPORÁRIO — o dono ainda não liberou a saída — e a
   * marcação deve continuar na fila. Descartá-la faria o motoboy ver "entregue"
   * numa entrega que o servidor nunca registrou.
   */
  readonly code = 'ROUTE_NOT_ACTIVE';

  constructor(routeId: string, status: string) {
    super(`Rota não está em andamento (${status})`, { routeId, status });
  }
}

export class StopAlreadyResolvedError extends ConflictError {
  /** Definitivo: reenviar não muda nada, a fila pode descartar. */
  readonly code = 'STOP_ALREADY_RESOLVED';

  constructor(stopId: string) {
    super('Parada já foi finalizada', { stopId });
  }
}

export class CourierUnavailableError extends ConflictError {
  constructor(courierId: string) {
    super('Motoboy inativo ou já está em outra rota', { courierId });
  }
}
