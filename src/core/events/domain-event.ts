/**
 * Fato consumado no domínio. Nome no passado, sempre.
 *
 * Gravados em tabela append-only pela UnitOfWork, no mesmo commit da mudança
 * que os gerou. Isso rende três coisas com um mecanismo só:
 *
 *  1. as métricas do piloto saem daqui, sem instrumentar nada duas vezes;
 *  2. auditoria — "por que esse pedido sumiu?" tem resposta;
 *  3. quando escalar, o mesmo log vira outbox para processamento assíncrono.
 */
export interface DomainEvent {
  readonly name: string;
  readonly occurredAt: Date;
  readonly establishmentId: string;
  readonly aggregateId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export const OrderEvents = {
  Created: 'order.created',
  Geocoded: 'order.geocoded',
  GeocodingFailed: 'order.geocoding_failed',
  /** O dono corrigiu o endereço porque o mapa não o encontrou. */
  AddressChanged: 'order.address_changed',
  Routed: 'order.routed',
  Delivered: 'order.delivered',
  Failed: 'order.failed',
  /** Cancelado na plataforma de origem — iFood, aiqfome. */
  CancelledExternally: 'order.cancelled_externally',
  TrackingOpened: 'order.tracking_opened',
  PaymentConfirmed: 'order.payment_confirmed',
  PaymentChargedBack: 'order.payment_charged_back',
  /** Estornado ao pagador — pelo painel do dono, ou pelo do Mercado Pago. */
  PaymentRefunded: 'order.payment_refunded',
} as const;

export const RouteEvents = {
  Planned: 'route.planned',
  Started: 'route.started',
  /** Reordenada a partir de onde o motoboy estava, no meio do turno. */
  Replanned: 'route.replanned',
  StopCompleted: 'route.stop_completed',
  Finished: 'route.finished',
} as const;
