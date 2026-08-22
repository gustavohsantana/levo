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
  constructor(routeId: string, status: string) {
    super(`Rota não está em andamento (${status})`, { routeId, status });
  }
}

export class StopAlreadyResolvedError extends ConflictError {
  constructor(stopId: string) {
    super('Parada já foi finalizada', { stopId });
  }
}

export class CourierUnavailableError extends ConflictError {
  constructor(courierId: string) {
    super('Motoboy inativo ou já está em outra rota', { courierId });
  }
}
