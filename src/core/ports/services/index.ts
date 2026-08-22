import type { Address, Coordinates } from '../../value-objects';
import type { OrderSourceKind } from '../../entities';

export interface Geocoder {
  /** `null` quando o endereço não foi localizado — não é exceção, é rotina. */
  geocode(address: Address): Promise<Coordinates | null>;
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
export interface OrderSource {
  readonly kind: OrderSourceKind;
  fetchPending(): Promise<ExternalOrder[]>;
  acknowledge(externalIds: string[]): Promise<void>;
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
