import type {
  Courier,
  Establishment,
  Order,
  OrderSourceKind,
  Product,
  Route,
} from '../../entities';
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
  /** Histórico de um entregador num intervalo, para o calendário e o acerto. */
  listByCourier(courierId: string, from: Date, to: Date): Promise<Route[]>;
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
  /** Só a região por enquanto: é o que a tela de configurações edita. */
  saveRegion(city: string | null, state: string | null): Promise<void>;
}

/** Posição do motoboy. Tabela mais escrita do sistema — ver retenção na Parte 3. */
export interface CourierPingRepository {
  record(routeId: string, coordinates: Coordinates, at: Date): Promise<void>;
  lastPing(routeId: string): Promise<{ coordinates: Coordinates; at: Date } | null>;
  trail(routeId: string, limit: number): Promise<Array<{ coordinates: Coordinates; at: Date }>>;
  purgeFinishedBefore(cutoff: Date): Promise<number>;
}

/**
 * O catálogo do estabelecimento.
 *
 * Listar aceita inativos para a tela de gestão; quem monta pedido só quer os
 * ativos, e é a tela que decide — o repositório não adivinha.
 */
export interface ProductRepository {
  list(options?: { onlyActive?: boolean }): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findManyByIds(ids: string[]): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface EventStore {
  append(events: DomainEvent[]): Promise<void>;
}

/**
 * Um aviso a mandar para o marketplace quando der.
 *
 * `CONFIRM` é "aceitei"; `READY`, "saiu da cozinha"; `DISPATCH`, "saiu para
 * entrega"; `DELIVERED`, "chegou". Cada plataforma
 * traduz do seu jeito, e algumas ignoram um dos dois — o iFood conclui o
 * pedido sozinho depois do dispatch, o aiqfome quer o "entregue" explícito.
 * Guardar o fato, e não a chamada, é o que permite isso.
 */
export interface MarketplaceCommandEntry {
  establishmentId: string;
  provider: 'IFOOD' | 'AIQFOME';
  externalOrderId: string;
  command: 'CONFIRM' | 'READY' | 'DISPATCH' | 'DELIVERED';
}

/**
 * Caixa de saída dos avisos ao marketplace.
 *
 * O enfileiramento acontece na mesma transação que grava a entrega: ou as duas
 * coisas valem, ou nenhuma. Chamar a API de terceiro ali dentro prenderia a
 * transação em rede alheia e perderia o aviso em qualquer falha — e o sintoma
 * seria o lojista dando baixa duas vezes, sem entender por quê.
 */
export interface MarketplaceOutbox {
  /** Idempotente: reenfileirar o mesmo aviso não cria outro. */
  enqueue(entries: MarketplaceCommandEntry[]): Promise<void>;
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
  products: ProductRepository;
  events: EventStore;
  marketplace: MarketplaceOutbox;
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
