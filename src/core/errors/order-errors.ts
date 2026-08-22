import { ConflictError, ValidationError } from './domain-error';

export class OrderNotGeocodedError extends ConflictError {
  constructor(orderId: string) {
    super('Pedido sem coordenadas não pode entrar em rota', { orderId });
  }
}

export class OrderAlreadyRoutedError extends ConflictError {
  readonly code = 'ORDER_ALREADY_ROUTED';

  constructor(orderId: string) {
    super('Pedido já está em uma rota', { orderId });
  }
}

export class OrderNotPendingError extends ConflictError {
  constructor(orderId: string, status: string) {
    super(`Pedido já foi finalizado (${status})`, { orderId, status });
  }
}

export class InvalidPhoneError extends ValidationError {
  constructor(raw: string) {
    super('Telefone inválido. Use DDD + número, ex: (41) 99999-9999', { raw });
  }
}

export class InvalidCoordinatesError extends ValidationError {
  constructor(lat: number, lng: number) {
    super('Coordenadas fora do intervalo válido', { lat, lng });
  }
}
