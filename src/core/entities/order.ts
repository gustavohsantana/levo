import { AggregateRoot } from './entity';
import { OrderEvents } from '../events/domain-event';
import {
  OrderAlreadyRoutedError,
  OrderNotGeocodedError,
  OrderNotPendingError,
} from '../errors';
import type { PaymentStatus } from './payment';
import { Address, Coordinates, Money, PhoneNumber, Token } from '../value-objects';

export type OrderSourceKind = 'MANUAL' | 'SITE' | 'WEBHOOK' | 'IFOOD' | 'AIQFOME';

export const OrderStatus = {
  New: 'NEW',
  InRoute: 'IN_ROUTE',
  Delivered: 'DELIVERED',
  Failed: 'FAILED',
  /** Cancelado na plataforma de origem, fora do Levô. Estado terminal. */
  Cancelled: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Um item do pedido, com **cópia** do nome e do preço.
 *
 * Preço de catálogo muda; o pedido registra o que foi vendido naquele dia por
 * aquele valor. Ler o preço do produto na hora de exibir faria o histórico se
 * reescrever a cada reajuste, e a conta do dia deixaria de fechar.
 */
export type PaymentMethod = 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'ONLINE';

export interface OrderItem {
  /** Procedência. Nulo quando o produto é apagado do catálogo. */
  productId: string | null;
  name: string;
  unitPrice: Money;
  quantity: number;
  /**
   * Desconto já aplicado sobre a linha inteira.
   *
   * Guardamos o valor, não a porcentagem: é o valor que entra na conta, e uma
   * porcentagem guardada precisaria ser recalculada a cada exibição — com
   * chance de dar um centavo diferente do que foi cobrado.
   */
  discount: Money;
}

interface OrderProps {
  id: string;
  establishmentId: string;
  source: OrderSourceKind;
  externalId: string | null;
  /** Numero curto na plataforma de origem. O que o cliente fala no telefone. */
  displayId: string | null;
  customerName: string;
  customerPhone: PhoneNumber | null;
  address: Address;
  coordinates: Coordinates | null;
  amount: Money;
  deliveryFee: Money;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus | null;
  items: OrderItem[];
  notes: string | null;
  status: OrderStatus;
  trackingToken: Token;
  routeId: string | null;
  confirmedAt: Date | null;
  readyAt: Date | null;
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
    displayId?: string | null;
    customerName: string;
    customerPhone?: PhoneNumber | null;
    address: Address;
    coordinates?: Coordinates | null;
    amount?: Money;
    deliveryFee?: Money;
    paymentMethod?: PaymentMethod | null;
    paymentStatus?: PaymentStatus | null;
    items?: OrderItem[];
    notes?: string | null;
    now?: Date;
  }): Order {
    const now = input.now ?? new Date();
    const itens = input.items ?? [];
    const taxa = input.deliveryFee ?? Money.zero();

    const order = new Order({
      id: input.id,
      establishmentId: input.establishmentId,
      source: input.source,
      externalId: input.externalId ?? null,
      displayId: input.displayId ?? null,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone ?? null,
      address: input.address,
      coordinates: input.coordinates ?? null,
      /*
       * Com itens, o total sai deles — digitar o total à mão ao lado de uma
       * lista de itens abriria a porta para os dois discordarem, e a versão
       * errada seria a que o dono vê na conta do dia.
       */
      amount: itens.length > 0 ? somar(itens).add(taxa) : (input.amount ?? Money.zero()),
      deliveryFee: taxa,
      paymentMethod: input.paymentMethod ?? null,
      paymentStatus: input.paymentStatus ?? null,
      items: itens,
      notes: input.notes?.trim() || null,
      status: OrderStatus.New,
      trackingToken: Token.generate(),
      routeId: null,
      confirmedAt: null,
      readyAt: null,
      createdAt: now,
      deliveredAt: null,
    });

    order.record(OrderEvents.Created, order.props.establishmentId, {
      source: input.source,
      hasCoordinates: order.props.coordinates !== null,
    }, now);

    return order;
  }

  /**
   * Corrige o endereço quando o mapa não o encontrou.
   *
   * Endereço brasileiro é bagunçado — condomínio sem número, rua nova, "depois
   * da igreja". Corrigir o texto é mais honesto que arrastar um alfinete: o
   * endereço certo também vai no link de rastreio do cliente e na tela do
   * motoboy, e um pino certo com endereço errado engana os dois.
   */
  changeAddress(address: Address, at: Date): void {
    if (this.props.status !== OrderStatus.New) {
      throw new OrderNotPendingError(this.id, this.props.status);
    }

    this.props.address = address;
    this.props.coordinates = null;
    this.record(OrderEvents.AddressChanged, this.props.establishmentId, {
      address: address.raw,
    }, at);
  }

  /**
   * O lojista aceitou o pedido.
   *
   * Idempotente de propósito: o evento `CFM` do iFood pode chegar depois de o
   * dono já ter confirmado aqui, e o primeiro carimbo é o que vale — ele conta
   * o tempo de preparo de verdade.
   */
  markConfirmed(at: Date): void {
    if (this.props.status !== OrderStatus.New) {
      throw new OrderNotPendingError(this.id, this.props.status);
    }

    this.props.confirmedAt ??= at;
  }

  /**
   * Saiu da cozinha.
   *
   * Confirma junto se ninguém confirmou: pular a etapa acontece na correria, e
   * recusar com "confirme antes" seria o sistema brigando com quem está
   * trabalhando.
   */
  markReady(at: Date): void {
    if (this.props.status !== OrderStatus.New) {
      throw new OrderNotPendingError(this.id, this.props.status);
    }

    this.props.confirmedAt ??= at;
    this.props.readyAt ??= at;
  }

  /** Reidrata do banco sem disparar eventos. Só o mapper usa. */
  static restore(props: OrderProps): Order {
    return new Order(props);
  }

  get establishmentId() { return this.props.establishmentId; }
  get source() { return this.props.source; }
  get externalId() { return this.props.externalId; }
  get displayId() { return this.props.displayId; }
  get customerName() { return this.props.customerName; }
  get customerPhone() { return this.props.customerPhone; }
  get address() { return this.props.address; }
  get coordinates() { return this.props.coordinates; }
  get amount() { return this.props.amount; }
  get confirmedAt() { return this.props.confirmedAt; }
  get readyAt() { return this.props.readyAt; }

  /**
   * Em qual coluna do painel o pedido está.
   *
   * Derivado, não guardado. O estado real é a combinação de `status` com os
   * carimbos de preparo — e um campo a mais para dizer o que já dá para
   * calcular é um campo a mais para ficar dessincronizado.
   */
  get stage(): 'NOVO' | 'MONTANDO' | 'PRONTO' | 'EM_ROTA' | 'FINALIZADO' {
    if (this.props.status !== OrderStatus.New) {
      return this.props.status === OrderStatus.InRoute ? 'EM_ROTA' : 'FINALIZADO';
    }

    if (this.props.readyAt) return 'PRONTO';
    if (this.props.confirmedAt) return 'MONTANDO';
    return 'NOVO';
  }
  get items(): readonly OrderItem[] { return this.props.items; }
  get paymentMethod() { return this.props.paymentMethod; }
  get paymentStatus() { return this.props.paymentStatus; }

  markPaymentPaid(at: Date): void {
    this.props.paymentStatus = 'PAID';
    this.record(OrderEvents.PaymentConfirmed, this.props.establishmentId, { orderId: this.id }, at);
  }

  markPaymentStatus(status: PaymentStatus): void {
    this.props.paymentStatus = status;
  }

  markPaymentChargedBack(at: Date): void {
    this.props.paymentStatus = 'CHARGED_BACK';
    this.record(OrderEvents.PaymentChargedBack, this.props.establishmentId, { orderId: this.id }, at);
  }

  /**
   * Só entra na fila da cozinha o que não cobra online, ou o que já pagou.
   * Recusado, em análise e Pix à espera ficam de fora.
   */
  get isReleasedToKitchen(): boolean {
    return (
      this.props.paymentStatus === null
      || this.props.paymentStatus === 'PAID'
      || this.props.paymentStatus === 'CHARGED_BACK'
    );
  }

  /** Pagamento online ainda não confirmado — não entra na fila do painel. */
  isAwaitingOnlinePayment(_at: Date): boolean {
    return this.props.paymentStatus === 'PENDING' || this.props.paymentStatus === 'IN_REVIEW';
  }

  get deliveryFee() { return this.props.deliveryFee; }
  /** O que é venda, sem o frete. */
  get subtotal() { return Money.fromCents(this.props.amount.cents - this.props.deliveryFee.cents); }
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
   * Aceita QUALQUER estado de partida, inclusive entregue, e não valida nada: o
   * fato já aconteceu lá fora, e recusá-lo aqui produz um painel que discorda
   * da realidade.
   *
   * Entregue também regride, e isso é deliberado. A versão anterior desistia
   * calada nesse caso, para não desfazer a entrega do motoboy — mas quem
   * cancela um pedido do marketplace decide se o lojista recebe. Mostrar
   * "Entregue" num pedido que o iFood cancelou esconde justamente a parte que
   * dói: a comida saiu e o dinheiro não vem. O trabalho do motoboy não se
   * perde — ele vive na parada da rota, que é outro registro.
   *
   * `entregue` no evento preserva a distinção para quem for auditar depois.
   */
  markCancelledExternally(now = new Date()): void {
    if (this.props.status === OrderStatus.Cancelled) return;

    const entregue = this.props.status === OrderStatus.Delivered;

    this.props.status = OrderStatus.Cancelled;
    this.props.routeId = null;
    this.record(OrderEvents.CancelledExternally, this.props.establishmentId, { entregue }, now);
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

/** Soma dos itens. Multiplicação em centavos, sem ponto flutuante no meio. */
function somar(itens: OrderItem[]): Money {
  return Money.fromCents(
    itens.reduce(
      (total, item) =>
        // O desconto nunca deixa a linha negativa: um desconto maior que o item
        // viraria crédito, que este produto não sabe representar.
        total + Math.max(0, item.unitPrice.cents * item.quantity - item.discount.cents),
      0,
    ),
  );
}
