import type { Address, Coordinates } from '../../value-objects';
import type { OrderSourceKind } from '../../entities';
import type { PaymentStatus } from '../../entities/payment';

export interface Geocoder {
  /**
   * `regiao` é a cidade e o estado do estabelecimento.
   *
   * Sem isso o geocodificador procura no país inteiro, e "Rua das Flores, 100"
   * casa com a primeira rua homônima que ele achar. O dono não digita a cidade
   * dele em todo pedido — nem deveria.
   */
  geocode(
    address: Address,
    regiao?: { city?: string | null; state?: string | null },
  ): Promise<Coordinates | null>;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RoutePath {
  geometry: string | null;
  distanceMeters: number;
  durationSeconds: number;
  legs: RouteLeg[];
}

export interface RoutingService {
  /**
   * Matriz de tempo real de deslocamento entre todos os pontos, em segundos.
   * `matrix[i][j]` = tempo de `i` até `j`. Assimétrica de propósito: mão única
   * e contramão fazem ida e volta custarem diferente.
   */
  durationMatrix(points: Coordinates[]): Promise<number[][]>;
  /** Traçado real na ordem dada, para desenhar no mapa e obter os ETAs. */
  path(points: Coordinates[]): Promise<RoutePath>;
}

export interface OptimizedRoute {
  /** Índices na ordem de visita, sem o ponto de partida (que é sempre 0). */
  order: number[];
  totalDurationSeconds: number;
}

export interface RouteOptimizer {
  /**
   * Recebe a matriz de durações (índice 0 = estabelecimento) e devolve a
   * melhor ordem de visita encontrada, fechando o ciclo de volta à origem.
   */
  optimize(matrix: number[][]): OptimizedRoute;
}

/** Pedido cru vindo de fora, antes de virar entidade. */
export interface ExternalOrder {
  externalId: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  reference: string | null;
  amountCents: number;
  notes: string | null;
  placedAt: Date;
}

/**
 * Contrato único para iFood, aiqfome e webhook genérico.
 *
 * Cada plataforma tem um adapter; o caso de uso de importação não sabe qual
 * está falando com ele. Trocar de plataforma é registrar outra implementação
 * no composition root.
 */
/**
 * Mudança de estado de um pedido NA PLATAFORMA de origem.
 *
 * O pedido não vive só aqui dentro: ele é cancelado pelo cliente, concluído
 * pelo próprio marketplace, despachado por outro sistema. Ignorar isso deixa o
 * Levô com uma versão desatualizada do mundo — e o motoboy sai para entregar
 * pedido que já não existe.
 */
export interface ExternalStatusChange {
  externalId: string;
  status: 'CONCLUDED' | 'CANCELLED' | 'DISPATCHED';
}

export interface OrderSource {
  readonly kind: OrderSourceKind;
  fetchPending(): Promise<ExternalOrder[]>;
  acknowledge(externalIds: string[]): Promise<void>;
  /**
   * Mudanças de estado vistas na última leitura.
   *
   * Opcional porque nem toda origem tem noção de estado: o webhook genérico
   * recebe pedido e nunca mais fala sobre ele.
   */
  statusChanges?(): ExternalStatusChange[];
}

/**
 * O que dá para mandar de volta para a plataforma.
 *
 * Os dois métodos são opcionais porque as plataformas não têm o mesmo ciclo. O
 * iFood entende "saiu para entrega" e conclui o pedido sozinho depois disso; o
 * aiqfome quer o "entregue" explícito e não tem noção de despacho para loja de
 * cardápio. Forçar as duas a implementar os dois obrigaria uma delas a mentir.
 *
 * Comando ausente não é erro: a caixa de saída marca como resolvido e segue.
 */
export interface MarketplaceCommands {
  readonly kind: OrderSourceKind;
  /** Aceito pelo lojista. */
  confirm?(externalOrderId: string): Promise<void>;
  /** Saiu da cozinha, esperando o entregador. */
  markReady?(externalOrderId: string): Promise<void>;
  /** Saiu para entrega. */
  dispatch?(externalOrderId: string): Promise<void>;
  /** Entregue ao cliente. */
  markDelivered?(externalOrderId: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface Logger {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
}

export interface PaymentGateway {
  createPixCharge(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    payerEmail?: string;
    expiresInMinutes: number;
    sandbox?: boolean;
  }): Promise<{
    externalId: string;
    qrCode: string;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
    expiresAt: Date;
  }>;

  /**
   * Checkout Pro: o cliente paga cartão na página do Mercado Pago.
   * 3DS, PCI e antifraude ficam lá; o Levô só guarda o id da preferência.
   */
  createCardCheckout(input: {
    accessToken: string;
    orderId: string;
    amountCents: number;
    description: string;
    payerEmail?: string;
    statementDescriptor?: string;
    backUrl?: string;
    expiresInMinutes: number;
    sandbox?: boolean;
  }): Promise<{
    externalId: string;
    checkoutUrl: string;
    expiresAt: Date;
  }>;

  getCharge(input: {
    accessToken: string;
    externalId: string;
    /** Fallback quando o banco guardou id PAY01… da Orders API. */
    orderId?: string;
  }): Promise<{
    status: PaymentStatus;
    paidAt: Date | null;
    amountCents: number;
    resolvedExternalId: string;
  }>;
}
