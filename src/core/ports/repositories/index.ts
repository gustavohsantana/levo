import type {
  Courier,
  Establishment,
  Order,
  OrderSourceKind,
  Payment,
  Product,
  Route,
} from '../../entities';
import type { DeliveryFeeBand } from '../../services/delivery-fee';
import type { OptionGroupSpec } from '../../services/option-selection';
import type { DomainEvent } from '../../events/domain-event';
import type { Coordinates } from '../../value-objects';
import type { CourierPayAgreement } from '../../services/courier-pay';

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
  /**
   * Ja existe uma proxima leva esperando por este motoboy?
   *
   * Uma so de cada vez. Duas filas para a mesma pessoa nao e adiantamento, e
   * bagunca: ele nao saberia qual sai primeiro, e o dono perderia a conta do
   * que ja separou.
   */
  hasPlannedRouteFor(courierId: string): Promise<boolean>;
  /** Ele esta na rua agora? Ninguem sai duas vezes ao mesmo tempo. */
  hasRouteInProgressFor(courierId: string): Promise<boolean>;
}

export interface CourierRepository {
  save(courier: Courier): Promise<void>;
  findById(id: string): Promise<Courier | null>;
  listActive(): Promise<Courier[]>;
  list(): Promise<Courier[]>;
  /**
   * O acordo de pagamento combinado com este motoboy.
   *
   * Fora da entidade `Courier` de propósito: é configuração de quanto se paga,
   * não estado do entregador — ninguém carrega tabela de preço para despachar
   * uma rota, e todo lugar que hoje lê um `Courier` passaria a arrastar isso.
   */
  payAgreement(courierId: string): Promise<CourierPayAgreement>;
  savePayAgreement(courierId: string, acordo: CourierPayAgreement): Promise<void>;
}

export interface EstablishmentRepository {
  current(): Promise<Establishment>;
  /** Faixas de taxa por distância, da menor para a maior. */
  deliveryFeeBands(): Promise<DeliveryFeeBand[]>;
  saveDeliveryFeeBands(bands: DeliveryFeeBand[]): Promise<void>;
  /** O que a tela de configurações edita. */
  /**
   * Liga ou desliga o aceite automático de pedido de marketplace.
   *
   * Separado de `saveSettings` de propósito: aquilo é um formulário que o dono
   * salva inteiro, isto é um interruptor que ele vira sozinho. Junto, virar o
   * interruptor exigiria reenviar cidade, estado e slug — e um deles chegar
   * vazio apagaria o que estava certo.
   */
  setAutoConfirm(ligado: boolean): Promise<void>;
  /** Manda a rota para o motoboy no WhatsApp assim que ela e planejada. */
  setWhatsappRoutes(ligado: boolean): Promise<void>;
  saveSettings(
    city: string | null,
    state: string | null,
    deliveryFeeCents: number,
    slug: string,
  ): Promise<void>;
  /**
   * Ordem das categorias no cardápio, pelo nome.
   *
   * Fica aqui, e não numa tabela de categoria, porque categoria é texto livre
   * no produto — não existe linha dela para carregar uma posição. Estreito como
   * `setAutoConfirm` pelo mesmo motivo: é um arrasta-e-solta, não um formulário
   * que o dono salva inteiro.
   */
  categoryOrder(): Promise<string[]>;
  saveCategoryOrder(nomes: string[]): Promise<void>;
}

/** Posição do motoboy. Tabela mais escrita do sistema — ver retenção na Parte 3. */
export interface CourierPingRepository {
  /** `source` diz se veio da tela do motoboy ou do Telegram — consentimentos diferentes. */
  record(
    routeId: string,
    coordinates: Coordinates,
    at: Date,
    source?: 'APP' | 'TELEGRAM',
  ): Promise<void>;
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
  /**
   * Renomeia a categoria em todos os produtos dela.
   *
   * Renomear para uma que já existe funde as duas — e isso é recurso, não
   * acidente: é assim que se conserta "Bebida" e "Bebidas" convivendo.
   */
  renameCategory(de: string, para: string): Promise<number>;
}

/**
 * Grupos de opção do estabelecimento.
 *
 * Separado do produto de propósito: o grupo existe por conta própria e é usado
 * por vários. "Frutas" é um objeto só, servindo os quatro tamanhos de açaí —
 * é isso que faz reajustar a Nutella ser um número e não quatro.
 */
export interface OptionGroupRepository {
  list(): Promise<OptionGroupSpec[]>;
  findById(id: string): Promise<OptionGroupSpec | null>;
  /** Os grupos de um produto, na ordem em que aparecem na tela. */
  forProduct(productId: string): Promise<OptionGroupSpec[]>;
  /** Os grupos de vários produtos de uma vez — o cardápio inteiro numa consulta. */
  forProducts(productIds: string[]): Promise<Map<string, OptionGroupSpec[]>>;
  save(grupo: OptionGroupSpec): Promise<void>;
  delete(id: string): Promise<void>;
  /** Substitui os grupos do produto pela lista dada, na ordem. */
  setForProduct(productId: string, groupIds: string[]): Promise<void>;
  /**
   * Anexa um grupo a todos os produtos de uma categoria.
   *
   * É o atalho que evita trinta cliques: uma pizzaria com trinta sabores anexa
   * "Tamanho" à categoria inteira de uma vez. Devolve quantos receberam.
   */
  attachToCategory(groupId: string, category: string): Promise<number>;
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

export interface PaymentRepository {
  save(payment: Payment): Promise<void>;
  /**
   * Pagamentos pendentes criados antes de `antesDe`, para reconciliação.
   *
   * O webhook do gateway é otimização, não garantia: cobrança que expira sem
   * ser paga não gera notificação confiável, e o pagamento fica pendente para
   * sempre — com o pedido preso em "aguardando pagamento" na tela do cliente.
   * Com Pix isso é a maioria dos casos, porque carrinho abandonado é a regra.
   */
  listPendingOlderThan(antesDe: Date, limite: number): Promise<Payment[]>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByExternalId(provider: Payment['provider'], externalId: string): Promise<Payment | null>;
}

/** Tudo que um caso de uso enxerga dentro de uma transação. */
/**
 * Caixa de saida das mensagens para o motoboy.
 *
 * Enfileirar e sincrono com o planejamento; enviar e do worker. WhatsApp fora do
 * ar nao pode derrubar o despacho — o motoboy sai para entregar de qualquer
 * jeito, e a mensagem tenta de novo no ciclo seguinte.
 */
export interface CourierNotificationOutbox {
  enqueue(input: {
    routeId: string;
    channel: 'TELEGRAM' | 'WHATSAPP';
    destination: string;
    text: string;
    /** A tela do motoboy. No Telegram vira botao de Mini App. */
    link: string;
  }): Promise<void>;
}

export interface Repositories {
  orders: OrderRepository;
  payments: PaymentRepository;
  routes: RouteRepository;
  couriers: CourierRepository;
  establishments: EstablishmentRepository;
  pings: CourierPingRepository;
  products: ProductRepository;
  optionGroups: OptionGroupRepository;
  events: EventStore;
  marketplace: MarketplaceOutbox;
  geocodeCache: GeocodeCacheRepository;
  courierNotifications: CourierNotificationOutbox;
}

/**
 * Planejar uma rota grava a rota, N paradas e atualiza N pedidos. Ou tudo, ou
 * nada: um pedido marcado "em rota" numa rota que não existe é um pedido que
 * some da tela do dono e nunca chega no cliente.
 */
export interface UnitOfWork {
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
