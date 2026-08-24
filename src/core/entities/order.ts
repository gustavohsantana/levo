import { AggregateRoot } from './entity';
import { OrderEvents } from '../events/domain-event';
import {
  OrderAlreadyRoutedError,
  OrderNotGeocodedError,
  OrderNotPendingError,
} from '../errors';
import { Address, Coordinates, Money, PhoneNumber, Token } from '../value-objects';

export type OrderSourceKind = 'MANUAL' | 'WEBHOOK' | 'IFOOD' | 'AIQFOME';

export const OrderStatus = {
  New: 'NEW',
  InRoute: 'IN_ROUTE',
  Delivered: 'DELIVERED',
  Failed: 'FAILED',
  /** Cancelado na plataforma de origem, fora do Levô. Estado terminal. */
  Cancelled: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

interface OrderProps {
  id: string;
  establishmentId: string;
  source: OrderSourceKind;
  externalId: string | null;
  customerName: string;
  customerPhone: PhoneNumber | null;
  address: Address;
  coordinates: Coordinates | null;
  amount: Money;
  notes: string | null;
  status: OrderStatus;
  trackingToken: Token;
  routeId: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
}

export class Order extends AggregateRoot {
  private props: OrderProps;

  private constructor(props: OrderProps) {
    super(props.id);
    this.props = props;
  }

  static create(input: {
    id: string;
    establishmentId: string;
    source: OrderSourceKind;
    externalId?: string | null;
    customerName: string;
    customerPhone?: PhoneNumber | null;
    address: Address;
    coordinates?: Coordinates | null;
    amount?: Money;
    notes?: string | null;
    now?: Date;
  }): Order {
    const now = input.now ?? new Date();
    const order = new Order({
      id: input.id,
      establishmentId: input.establishmentId,
      source: input.source,
      externalId: input.externalId ?? null,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone ?? null,
      address: input.address,
      coordinates: input.coordinates ?? null,
      amount: input.amount ?? Money.zero(),
      notes: input.notes?.trim() || null,
      status: OrderStatus.New,
      trackingToken: Token.generate(),
      routeId: null,
      createdAt: now,
      deliveredAt: null,
    });

    order.record(OrderEvents.Created, order.props.establishmentId, {
      source: input.source,
      hasCoordinates: order.props.coordinates !== null,
    }, now);

    return order;
  }

  /** Reidrata do banco sem disparar eventos. Só o mapper usa. */
  static restore(props: OrderProps): Order {
    return new Order(props);
  }

  get establishmentId() { return this.props.establishmentId; }
  get source() { return this.props.source; }
  get externalId() { return this.props.externalId; }
  get customerName() { return this.props.customerName; }
  get customerPhone() { return this.props.customerPhone; }
  get address() { return this.props.address; }
  get coordinates() { return this.props.coordinates; }
  get amount() { return this.props.amount; }
  get notes() { return this.props.notes; }
  get status() { return this.props.status; }
  get trackingToken() { return this.props.trackingToken; }
  get routeId() { return this.props.routeId; }
  get createdAt() { return this.props.createdAt; }
  get deliveredAt() { return this.props.deliveredAt; }

  get isGeocoded(): boolean {
    return this.props.coordinates !== null;
  }

  /** Só entra em rota o que está pendente e localizado no mapa. */
  get canBeRouted(): boolean {
    return this.props.status === OrderStatus.New && this.isGeocoded;
  }

  locateAt(coordinates: Coordinates, now = new Date()): void {
    this.props.coordinates = coordinates;
    this.record(OrderEvents.Geocoded, this.props.establishmentId, coordinates.toJSON(), now);
  }

  markGeocodingFailed(reason: string, now = new Date()): void {
    this.record(OrderEvents.GeocodingFailed, this.props.establishmentId, { reason }, now);
  }

  assignToRoute(routeId: string, now = new Date()): void {
    if (this.props.status !== OrderStatus.New) {
      if (this.props.routeId) throw new OrderAlreadyRoutedError(this.id);
      throw new OrderNotPendingError(this.id, this.props.status);
    }
    if (!this.isGeocoded) throw new OrderNotGeocodedError(this.id);

    this.props.status = OrderStatus.InRoute;
    this.props.routeId = routeId;
    this.record(OrderEvents.Routed, this.props.establishmentId, { routeId }, now);
  }

  markDelivered(now = new Date()): void {
    this.ensureInRoute();
    this.props.status = OrderStatus.Delivered;
    this.props.deliveredAt = now;
    this.record(OrderEvents.Delivered, this.props.establishmentId, {
      minutesSinceCreated: Math.round((now.getTime() - this.props.createdAt.getTime()) / 60_000),
    }, now);
  }

  markFailed(reason: string | null, now = new Date()): void {
    this.ensureInRoute();
    this.props.status = OrderStatus.Failed;
    this.record(OrderEvents.Failed, this.props.establishmentId, { reason }, now);
  }

  /**
   * Cancelado na plataforma de origem — pelo cliente ou pela própria loja, fora
   * do Levô.
   *
   * Diferente das outras transições, esta aceita QUALQUER estado de partida e
   * não valida nada: o fato já aconteceu lá fora, e recusá-lo aqui só produziria
   * um painel que discorda da realidade. Um pedido já entregue é o único que
   * não regride — entrega feita não se desfaz por cancelamento tardio.
   */
  markCancelledExternally(now = new Date()): void {
    if (this.props.status === OrderStatus.Delivered) return;

    this.props.status = OrderStatus.Cancelled;
    this.props.routeId = null;
    this.record(OrderEvents.CancelledExternally, this.props.establishmentId, {}, now);
  }

  /**
   * Concluído na plataforma de origem.
   *
   * Vale como entrega: o marketplace só conclui o pedido depois que ele chegou
   * ao cliente. Quando o motoboy já marcou aqui, não faz nada — quem chegou
   * primeiro venceu, e o horário do toque é o mais confiável.
   */
  markConcludedExternally(now = new Date()): void {
    if (this.props.status === OrderStatus.Delivered) return;

    this.props.status = OrderStatus.Delivered;
    this.props.deliveredAt = now;
    this.record(OrderEvents.Delivered, this.props.establishmentId, { externo: true }, now);
  }

  /** O cliente abriu o link de rastreio — métrica de adoção do piloto. */
  recordTrackingOpened(now = new Date()): void {
    this.record(OrderEvents.TrackingOpened, this.props.establishmentId, {}, now);
  }

  private ensureInRoute(): void {
    if (this.props.status !== OrderStatus.InRoute) {
      throw new OrderNotPendingError(this.id, this.props.status);
    }
  }
}
