import type { Courier, Establishment, Order, OrderSourceKind, Route } from '../../entities';
import type { DomainEvent } from '../../events/domain-event';
import type { Coordinates } from '../../value-objects';

/**
 * Toda implementação destas interfaces já nasce amarrada a um estabelecimento.
 *
 * O escopo de tenant não é um parâmetro que o caso de uso lembra de passar —
 * é uma propriedade da instância, injetada na composição. Não existe assinatura
 * neste arquivo que permita ler dado de outro estabelecimento por engano.
 */

export interface OrderRepository {
  save(order: Order): Promise<void>;
  saveMany(orders: Order[]): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findManyByIds(ids: string[]): Promise<Order[]>;
  /** Chave da idempotência: o polling do iFood reentrega evento. */
  findBySourceRef(source: OrderSourceKind, externalId: string): Promise<Order | null>;
  findByTrackingToken(token: string): Promise<Order | null>;
  listPending(): Promise<Order[]>;
  listOfDay(day: Date): Promise<Order[]>;
}

export interface RouteRepository {
  save(route: Route): Promise<void>;
  findById(id: string): Promise<Route | null>;
  listActive(): Promise<Route[]>;
  listOfDay(day: Date): Promise<Route[]>;
  hasActiveRouteFor(courierId: string): Promise<boolean>;
}

export interface CourierRepository {
  save(courier: Courier): Promise<void>;
  findById(id: string): Promise<Courier | null>;
  listActive(): Promise<Courier[]>;
  list(): Promise<Courier[]>;
}

export interface EstablishmentRepository {
  current(): Promise<Establishment>;
}

/** Posição do motoboy. Tabela mais escrita do sistema — ver retenção na Parte 3. */
export interface CourierPingRepository {
  record(routeId: string, coordinates: Coordinates, at: Date): Promise<void>;
  lastPing(routeId: string): Promise<{ coordinates: Coordinates; at: Date } | null>;
  trail(routeId: string, limit: number): Promise<Array<{ coordinates: Coordinates; at: Date }>>;
  purgeFinishedBefore(cutoff: Date): Promise<number>;
}

export interface EventStore {
  append(events: DomainEvent[]): Promise<void>;
}

export interface GeocodeCacheRepository {
  get(cacheKey: string): Promise<Coordinates | null>;
  set(cacheKey: string, coordinates: Coordinates): Promise<void>;
}

/** Tudo que um caso de uso enxerga dentro de uma transação. */
export interface Repositories {
  orders: OrderRepository;
  routes: RouteRepository;
  couriers: CourierRepository;
  establishments: EstablishmentRepository;
  pings: CourierPingRepository;
  events: EventStore;
  geocodeCache: GeocodeCacheRepository;
}

/**
 * Planejar uma rota grava a rota, N paradas e atualiza N pedidos. Ou tudo, ou
 * nada: um pedido marcado "em rota" numa rota que não existe é um pedido que
 * some da tela do dono e nunca chega no cliente.
 */
export interface UnitOfWork {
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
