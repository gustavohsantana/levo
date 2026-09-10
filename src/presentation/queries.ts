import 'server-only';
import { containerFor } from '@/composition-root';
import type { Order, Route } from '@/core';
import { requireSession } from './http/session';
import { completar } from '@/application/use-cases/catalog/reorder-catalog';
import { statusDoRastreio, textoDoRastreio } from '@/core/services/tracking-status';

/**
 * Leituras das telas do dono.
 *
 * Server Components chamam estas funções **direto**, sem passar por HTTP. Uma
 * API REST para consumo do próprio frontend seria uma camada a mais de
 * serialização, validação e tratamento de erro sem nenhum consumidor externo
 * para justificá-la. Os route handlers existem só para quem é de fora: webhook,
 * PWA do motoboy e a página pública de rastreio.
 */

export interface OrderView {
  id: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  reference: string | null;
  amountCents: number;
  notes: string | null;
  source: 'MANUAL' | 'SITE' | 'WEBHOOK' | 'IFOOD' | 'AIQFOME';
  /** Numero curto na plataforma. Nulo em pedido manual. */
  displayId: string | null;
  deliveryFeeCents: number;
  paymentMethod: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'ONLINE' | null;
  status: 'NEW' | 'IN_ROUTE' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  /** Coluna do painel. Derivado de `status` mais os carimbos de preparo. */
  stage: 'NOVO' | 'MONTANDO' | 'PRONTO' | 'EM_ROTA' | 'FINALIZADO';
  confirmedAt: string | null;
  readyAt: string | null;
  /** Marcado pelo dono porque o cliente ligou cobrando. */
  urgente: boolean;
  /** Retirada no balcão: o cliente busca, não vai para rota. */
  pickup: boolean;
  items: Array<{
    name: string;
    /** Complementos, como o marketplace os descreve. Vazio no pedido manual. */
    options: string[];
    quantity: number;
    unitPriceCents: number;
    discountCents: number;
    /** Foto do produto, para a cozinha bater o olho. Nulo quando não há. */
    imageUrl: string | null;
  }>;
  isGeocoded: boolean;
  coordinates: { lat: number; lng: number } | null;
  createdAt: string;
  trackingUrl: string;
  whatsappLink: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'IN_REVIEW' | 'REJECTED' | 'CHARGED_BACK' | null;
}

export interface RouteView {
  id: string;
  courierId: string;
  courierName: string;
  /** Conversa do motoboy já com a rota escrita. `null` sem telefone válido. */
  courierWhatsappLink: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';
  accessToken: string;
  geometry: string | null;
  distanceMeters: number;
  durationSeconds: number;
  baselineDurationSeconds: number;
  savedSeconds: number;
  savedMinutes: number;
  createdAt: string;
  startedAt: string | null;
  stops: Array<{
    id: string;
    orderId: string;
    position: number;
    status: 'PENDING' | 'DELIVERED' | 'FAILED';
    etaSeconds: number;
    customerName: string;
    address: string;
    coordinates: { lat: number; lng: number } | null;
  }>;
}

export async function currentContainer() {
  const session = await requireSession();
  return { session, container: containerFor(session.establishmentId) };
}

function toOrderView(
  order: Order,
  whatsapp: string | null,
  trackingUrl: string,
  /** Foto por produto, quando quem chama quer os ícones (a cozinha). */
  imagensPorProduto?: Map<string, string | null>,
): OrderView {
  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone?.value ?? null,
    address: order.address.raw,
    reference: order.address.reference,
    amountCents: order.amount.cents,
    deliveryFeeCents: order.deliveryFee.cents,
    paymentMethod: order.paymentMethod,
    source: order.source,
    displayId: order.displayId,
    notes: order.notes,
    status: order.status,
    isGeocoded: order.isGeocoded,
    coordinates: order.coordinates?.toJSON() ?? null,
    stage: order.stage,
    urgente: order.urgente,
    pickup: order.isPickup,
    items: order.items.map((item) => ({
      name: item.name,
      options: item.options ?? [],
      quantity: item.quantity,
      unitPriceCents: item.unitPrice.cents,
      discountCents: item.discount.cents,
      imageUrl: item.productId ? (imagensPorProduto?.get(item.productId) ?? null) : null,
    })),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    trackingUrl,
    whatsappLink: whatsapp,
    paymentStatus: order.paymentStatus,
  };
}

/** Um grupo de opções como a tela precisa dele. */
export interface OptionGroupView {
  id: string;
  name: string;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; priceCents: number }>;
  /** Quantos produtos já oferecem este grupo. */
  produtos: number;
}

export interface ProductView {
  id: string;
  /** Os grupos que este produto oferece, na ordem da tela. */
  optionGroupIds: string[];
  name: string;
  description: string | null;
  priceCents: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  source: string;
  importado: boolean;
}

/**
 * A ordem das categorias escolhida pelo dono, já completada com as que
 * apareceram depois — categoria nasce de um produto, não de um cadastro.
 */
export async function getOrdemCategorias(): Promise<string[]> {
  const { container } = await currentContainer();
  return container.read(async (repos) => {
    const [guardada, produtos] = await Promise.all([
      repos.establishments.categoryOrder(),
      repos.products.list(),
    ]);
    return completar(guardada, produtos);
  });
}

export async function getCatalog(): Promise<ProductView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const produtos = await repos.products.list();
    /*
     * Em lote: o catálogo tem dezenas de produtos, e uma consulta por produto
     * seria N+1 numa tela que o dono abre o tempo todo.
     */
    const grupos = await repos.optionGroups.forProducts(produtos.map((p) => p.id));

    return produtos.map((p) => ({
      id: p.id,
      optionGroupIds: (grupos.get(p.id) ?? []).map((g) => g.id),
      name: p.name,
      description: p.description,
      priceCents: p.price.cents,
      category: p.category,
      imageUrl: p.imageUrl,
      active: p.active,
      source: p.source,
      importado: p.importado,
    }));
  });
}

export interface CourierView {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  busy: boolean;
  /** O acordo em uma linha. `null` quando ainda não foi combinado. */
  pagamento: string | null;
  /** Quantos pedidos ele leva por viagem. */
  maxStops: number;
  /** Onde ele estava por último, se está em rota agora. */
  posicao: { lat: number; lng: number; at: string; origem: string } | null;
}

/**
 * Os grupos do estabelecimento, com quantos produtos usam cada um.
 *
 * A contagem existe para o dono não apagar sem saber o estrago: "Frutas" usado
 * por quatro produtos é decisão diferente de um grupo órfão.
 */
export async function getOptionGroups(): Promise<OptionGroupView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const grupos = await repos.optionGroups.list();
    const produtos = await repos.products.list();
    const porProduto = await repos.optionGroups.forProducts(produtos.map((p) => p.id));

    const uso = new Map<string, number>();
    for (const lista of porProduto.values()) {
      for (const g of lista) uso.set(g.id, (uso.get(g.id) ?? 0) + 1);
    }

    return grupos.map((g) => ({
      id: g.id,
      name: g.name,
      min: g.min,
      max: g.max,
      options: g.options.map((o) => ({ id: o.id, name: o.name, priceCents: o.price.cents })),
      produtos: uso.get(g.id) ?? 0,
    }));
  });
}

export interface RotaNoMapa {
  routeId: string;
  courierId: string;
  courierName: string;
  /** Traçado da rota, como o roteirizador devolveu. */
  geometry: string | null;
  posicao: { lat: number; lng: number; at: string; origem: string } | null;
  /**
   * Quando ele deve estar de volta na loja.
   *
   * É a pergunta que o dono faz o tempo todo no sábado — não "onde ele está",
   * mas "quando posso mandar a próxima leva". Sai da duração do ciclo fechado,
   * que já inclui a perna da última entrega de volta.
   */
  retornoPrevisto: string | null;
  /** Por que ele aparece (ou não) no mapa: ativo, por entrega, recusou, parou. */
  rastreio: string;
  paradas: Array<{
    numero: number;
    lat: number;
    lng: number;
    cliente: string;
    entregue: boolean;
  }>;
}

/**
 * Todas as rotas em andamento, para o mapa do dono.
 *
 * Aqui vai o traçado inteiro e a ordem das paradas — o oposto do que o cliente
 * recebe. A diferença não é de tela, é de quem está olhando: o dono conhece
 * todos os endereços porque são pedidos dele; o cliente conhece só o próprio.
 */
export async function getRotasNoMapa(): Promise<RotaNoMapa[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const ativas = await repos.routes.listActive();
    if (ativas.length === 0) return [];

    const couriers = await repos.couriers.list();
    const nomes = new Map(couriers.map((c) => [c.id, c.name]));
    const modos = new Map(couriers.map((c) => [c.id, c.tracking]));
    const recusas = new Map(couriers.map((c) => [c.id, c.trackingDeniedAt]));

    /*
     * Pedidos e posições em lote. Uma consulta por rota transformaria o mapa de
     * um sábado com três motoboys em três idas ao banco a cada atualização.
     */
    const orders = await repos.orders.findManyByIds(
      ativas.flatMap((r) => r.stops.map((s) => s.orderId)),
    );
    const porPedido = new Map(orders.map((o) => [o.id, o]));

    const posicoes = await Promise.all(
      ativas.map(async (r) => [r.id, await repos.pings.lastPing(r.id)] as const),
    );
    const ultima = new Map(posicoes);

    return ativas.map((rota) => {
      const ping = ultima.get(rota.id);

      return {
        routeId: rota.id,
        courierId: rota.courierId,
        courierName: nomes.get(rota.courierId) ?? '—',
        geometry: rota.geometry,
        posicao: ping
          ? {
              ...ping.coordinates.toJSON(),
              at: ping.at.toISOString(),
              /*
               * A origem muda o que o pino significa. GPS é onde ele está;
               * "entrega" é onde ele esteve, no portão do último cliente — e
               * pode já ter andado muito desde então.
               */
              origem: ping.source === 'CHECKIN' ? 'entrega' : 'GPS',
            }
          : null,
        /*
         * Só depois de sair. Antes disso a duração é uma previsão sem âncora no
         * relógio, e um horário inventado é pior que horário nenhum: o dono
         * planeja a próxima leva em cima dele.
         */
        rastreio: textoDoRastreio(
          statusDoRastreio({
            modo: modos.get(rota.courierId) ?? 'CHECKIN',
            ultimoPing: ping?.at ?? null,
            recusadoEm: recusas.get(rota.courierId) ?? null,
            agora: new Date(),
          }),
        ),
        retornoPrevisto: rota.startedAt
          ? new Date(rota.startedAt.getTime() + rota.durationSeconds * 1000).toISOString()
          : null,
        paradas: rota.stops
          .map((stop) => {
            const pedido = porPedido.get(stop.orderId);
            const c = pedido?.coordinates?.toJSON();
            if (!c) return null;
            return {
              numero: stop.position,
              lat: c.lat,
              lng: c.lng,
              cliente: pedido!.customerName,
              entregue: stop.status !== 'PENDING',
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => a.numero - b.numero),
      };
    });
  });
}

/** Onde a loja fica. É o centro do mapa dos entregadores. */
export async function getLojaNoMapa(): Promise<{ lat: number; lng: number; nome: string } | null> {
  const { container } = await currentContainer();
  return container.read(async (repos) => {
    const e = await repos.establishments.current();
    const c = e.coordinates.toJSON();
    return { lat: c.lat, lng: c.lng, nome: e.name };
  });
}

export async function getCouriers(): Promise<CourierView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const couriers = await repos.couriers.list();
    const ativas = await repos.routes.listActive();

    /*
     * O acordo e a última posição vêm junto com a lista.
     *
     * O dono quer duas respostas ao abrir esta tela — quanto pago a cada um, e
     * onde eles estão. Escondê-las atrás de um clique por motoboy transforma
     * uma olhada em uma expedição.
     */
    const acordos = await Promise.all(
      couriers.map(async (c) => [c.id, await repos.couriers.payAgreement(c.id)] as const),
    );
    const porId = new Map(acordos);

    const emRota = new Map(ativas.map((r) => [r.courierId, r.id]));
    const posicoes = await Promise.all(
      [...emRota.entries()].map(
        async ([courierId, routeId]) => [courierId, await repos.pings.lastPing(routeId)] as const,
      ),
    );
    const ultimaPosicao = new Map(posicoes);

    return couriers.map((courier) => {
      const acordo = porId.get(courier.id);
      const ping = ultimaPosicao.get(courier.id);

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone.formatted,
        active: courier.active,
        busy: emRota.has(courier.id),
        pagamento: acordo ? resumoDoAcordo(acordo) : null,
        maxStops: courier.maxStops,
        posicao: ping
          ? {
              ...ping.coordinates.toJSON(),
              at: ping.at.toISOString(),
              origem: ping.source === 'CHECKIN' ? 'entrega' : 'GPS',
            }
          : null,
      };
    });
  });
}

/**
 * O acordo em uma linha, para caber na lista.
 *
 * `null` quando ainda não foi combinado — e a tela precisa dizer isso, não
 * mostrar "R$ 0,00": zero parece uma conta fechada, e o dono só descobriria o
 * buraco no dia do acerto.
 */
function resumoDoAcordo(acordo: {
  model: string;
  perDelivery: { cents: number };
  daily: { cents: number };
  bands: unknown[];
}): string | null {
  const reais = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

  if (acordo.model === 'POR_FAIXA') {
    return acordo.bands.length > 0 ? `${acordo.bands.length} faixas por distância` : null;
  }
  if (acordo.model === 'DIARIA_E_ENTREGA') {
    if (acordo.daily.cents === 0 && acordo.perDelivery.cents === 0) return null;
    return `${reais(acordo.daily.cents)}/dia + ${reais(acordo.perDelivery.cents)}/entrega`;
  }
  return acordo.perDelivery.cents > 0 ? `${reais(acordo.perDelivery.cents)} por entrega` : null;
}

export interface CourierDay {
  /** `YYYY-MM-DD`, no fuso do estabelecimento. */
  date: string;
  routes: number;
  deliveries: number;
  failed: number;
  distanceMeters: number;
}

export interface CourierRouteView {
  id: string;
  createdAt: string;
  status: string;
  stops: number;
  deliveries: number;
  failed: number;
  distanceMeters: number;
  durationSeconds: number;
  /** Detalhe de cada parada, para o acordeão da tela. */
  paradas: Array<{
    position: number;
    customerName: string;
    address: string;
    status: 'PENDING' | 'DELIVERED' | 'FAILED';
    amountCents: number;
    /** Distância do trecho anterior até esta parada — o km desta entrega. */
    legDistanceMeters: number;
  }>;
}

/**
 * O mês de trabalho de um entregador.
 *
 * Serve para o acerto: por entrega, por dia ou por rota, o dono precisa do
 * número que ele usa para pagar. Por isso os totais vêm por dia e por rota, e
 * **não** por parada — a distância que guardamos é a da rota inteira, e
 * reparti-la entre as entregas seria estimativa apresentada como fato.
 */
export async function getCourierMonth(courierId: string, month: Date) {
  const { container } = await currentContainer();

  const from = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const to = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

  return container.read(async (repos) => {
    const courier = await repos.couriers.findById(courierId);
    const acordo = await repos.couriers.payAgreement(courierId);
    const routes = await repos.routes.listByCourier(courierId, from, to);

    /*
     * Os pedidos vêm numa consulta só, e não uma por rota: um mês movimentado
     * tem dezenas de rotas, e uma ida ao banco por rota transformaria a tela
     * num travamento de segundos.
     */
    const pedidos = await repos.orders.findManyByIds(
      routes.flatMap((route) => route.stops.map((stop) => stop.orderId)),
    );
    const pedidoPorId = new Map(pedidos.map((pedido) => [pedido.id, pedido]));

    const porDia = new Map<string, CourierDay>();

    const detalhes: CourierRouteView[] = routes.map((route) => {
      const entregues = route.stops.filter((stop) => stop.status === 'DELIVERED').length;
      const falhas = route.stops.filter((stop) => stop.status === 'FAILED').length;
      const dia = diaLocal(route.createdAt);

      const atual = porDia.get(dia) ?? {
        date: dia,
        routes: 0,
        deliveries: 0,
        failed: 0,
        distanceMeters: 0,
      };

      porDia.set(dia, {
        ...atual,
        routes: atual.routes + 1,
        deliveries: atual.deliveries + entregues,
        failed: atual.failed + falhas,
        distanceMeters: atual.distanceMeters + route.distanceMeters,
      });

      return {
        id: route.id,
        createdAt: route.createdAt.toISOString(),
        status: route.status,
        stops: route.stops.length,
        deliveries: entregues,
        failed: falhas,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        paradas: [...route.stops]
          .sort((a, b) => a.position - b.position)
          .map((stop) => {
            const pedido = pedidoPorId.get(stop.orderId);
            return {
              position: stop.position,
              customerName: pedido?.customerName ?? '—',
              address: pedido?.address.raw ?? '—',
              status: stop.status,
              amountCents: pedido?.amount.cents ?? 0,
              legDistanceMeters: stop.legDistanceMeters,
            };
          }),
      };
    });

    return {
      courier: courier
        ? {
            id: courier.id,
            name: courier.name,
            phone: courier.phone.formatted,
            active: courier.active,
            telegramChatId: courier.telegramChatId,
          }
        : null,
      days: [...porDia.values()].sort((a, b) => a.date.localeCompare(b.date)),
      routes: detalhes,
      acordo: {
        model: acordo.model,
        perDeliveryCents: acordo.perDelivery.cents,
        dailyCents: acordo.daily.cents,
        bands: acordo.bands.map((b) => ({
          uptoMeters: b.uptoMeters,
          amountCents: b.amount.cents,
        })),
      },
    };
  });
}

/**
 * O dia como o lojista o vê, não como o servidor o guarda.
 *
 * O servidor roda em UTC; uma rota das 22h de Pouso Alegre cairia no dia
 * seguinte se agrupássemos pela data crua — e o acerto do mês fecharia errado
 * exatamente nas rotas de fim de expediente.
 */
function diaLocal(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * O que a cozinha precisa ver: só o que ainda vai para o fogo ou para o balcão.
 *
 * Deliberadamente separado de `getDashboard`: aquela consulta carrega rotas,
 * motoboys e faixas de taxa, e a tela da cozinha recarrega a cada cinco
 * segundos. Reaproveitar seria pagar sete consultas por uma pergunta que precisa
 * de uma.
 */
/** O que o sino da barra lateral precisa saber. */
export interface PedidoNovoView {
  id: string;
  cliente: string;
  valorCentavos: number;
  criadoEm: string;
  origem: OrderView['source'];
}

/**
 * Só a fila de espera, e só o que cabe num balão.
 *
 * Consultado de dez em dez segundos por toda tela do painel, então carrega o
 * mínimo: nada de itens, links de WhatsApp ou rota. Quem quer o pedido inteiro
 * clica e vai para Pedidos.
 */
export async function getPedidosNovos(establishmentId: string): Promise<PedidoNovoView[]> {
  const container = containerFor(establishmentId);

  return container.read(async (repos) => {
    const pendentes = await repos.orders.listPending();

    return pendentes
      // `stage` é a regra do domínio; repeti-la aqui é como as duas se separam.
      .filter((order) => order.stage === 'NOVO')
      .map((order) => ({
        id: order.id,
        cliente: order.customerName,
        valorCentavos: order.amount.cents,
        criadoEm: order.createdAt.toISOString(),
        origem: order.source,
      }));
  });
}

export async function getCozinha(): Promise<OrderView[]> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const establishment = await repos.establishments.current();
    const pendentes = await repos.orders.listPending();

    /*
     * As fotos dos produtos, numa consulta só — a cozinha bate o olho no ícone
     * e sabe o que é sem ler. Vem por id, não por nome: item de marketplace ou
     * produto sem foto simplesmente não tem ícone, e tudo bem.
     */
    const idsDeProduto = [
      ...new Set(
        pendentes.flatMap((o) =>
          o.items.map((i) => i.productId).filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const produtos = idsDeProduto.length ? await repos.products.findManyByIds(idsDeProduto) : [];
    const imagens = new Map(produtos.map((p) => [p.id, p.imageUrl]));

    return pendentes
      .map((order) =>
        toOrderView(
          order,
          container.whatsapp.dispatchLink(order, establishment.name),
          container.whatsapp.trackingUrl(order),
          imagens,
        ),
      )
      /*
       * Fora de rota e não entregue. Pedido que já saiu não é mais assunto da
       * cozinha, e mostrá-lo empurraria para baixo o que ainda está no fogo.
       */
      .filter((v) => v.stage === 'NOVO' || v.stage === 'MONTANDO' || v.stage === 'PRONTO');
  });
}

export async function getDashboard() {
  const { session, container } = await currentContainer();

  return container.readOnly(async (repos) => {
    /**
     * Em paralelo, e não em fila.
     *
     * Antes isto rodava dentro de uma transação, onde disparar consultas em
     * paralelo é desaconselhado — então eram sete idas ao banco em série, cerca
     * de 120 ms cada, com o dono esperando quase um segundo por uma tela que só
     * lê.
     *
     * A transação não comprava nada aqui: se um pedido chega no meio da leitura,
     * a única consequência é ele aparecer no próximo render, segundos depois.
     * Fora dela, as sete saem juntas.
     */
    const [
      establishment,
      feeBands,
      pending,
      todayOrders,
      activeRoutes,
      couriers,
      todayRoutes,
    ] = await Promise.all([
      repos.establishments.current(),
      repos.establishments.deliveryFeeBands(),
      repos.orders.listPending(),
      repos.orders.listOfDay(new Date()),
      repos.routes.listActive(),
      repos.couriers.list(),
      repos.routes.listOfDay(new Date()),
    ]);

    /**
     * Uma rota que virou a meia-noite ainda está na rua, mas seus pedidos são
     * de ontem e não aparecem em `listOfDay`. Sem buscá-los explicitamente, o
     * painel mostraria "—" no lugar do nome de cada cliente justamente na rota
     * que o dono mais precisa acompanhar.
     */
    const routeOrderIds = activeRoutes.flatMap((route) =>
      route.stops.map((stop) => stop.orderId),
    );
    const knownIds = new Set(todayOrders.map((order) => order.id));
    const missing = routeOrderIds.filter((id) => !knownIds.has(id));
    const extraOrders = missing.length > 0 ? await repos.orders.findManyByIds(missing) : [];

    const orderById = new Map(
      [...todayOrders, ...extraOrders].map((order) => [order.id, order]),
    );

    return {
      session,
      establishment: {
        id: establishment.id,
        name: establishment.name,
        coordinates: establishment.coordinates.toJSON(),
        deliveryFeeReais: establishment.deliveryFee.reais,
        autoConfirmOrders: establishment.autoConfirmOrders,
        feeBands: feeBands.map((b) => ({ km: b.uptoMeters / 1000, reais: b.fee.reais })),
      },
      pending: pending.map((order) =>
        toOrderView(
          order,
          container.whatsapp.dispatchLink(order, establishment.name),
          container.whatsapp.trackingUrl(order),
        ),
      ),
      orders: todayOrders.map((order) =>
        toOrderView(
          order,
          container.whatsapp.dispatchLink(order, establishment.name),
          container.whatsapp.trackingUrl(order),
        ),
      ),
      couriers: couriers.map((courier) => ({
        id: courier.id,
        name: courier.name,
        phone: courier.phone.formatted,
        active: courier.active,
        /*
         * Dois estados, não um.
         *
         * "Na rua" não impede o dono de já separar a próxima leva — é o
         * contrário, é quando ele mais quer adiantar. O que impede é já existir
         * uma leva esperando por essa pessoa.
         */
        naRua: activeRoutes.some(
          (route) => route.courierId === courier.id && route.status === 'IN_PROGRESS',
        ),
        filaCheia: activeRoutes.some(
          (route) => route.courierId === courier.id && route.status === 'PLANNED',
        ),
      })),
      activeRoutes: activeRoutes.map((route) =>
        toRouteView(
        route,
        orderById,
        couriers.find((c) => c.id === route.courierId)?.name ?? '—',
        container.whatsapp.routeLink({
          accessToken: route.accessToken.value,
          courierWhatsapp:
            couriers.find((c) => c.id === route.courierId)?.phone.whatsapp ?? null,
          courierName: couriers.find((c) => c.id === route.courierId)?.name ?? '',
          stops: route.stops.length,
        }),
      ),
      ),
      /** Números do dia — a evidência que o piloto precisa produzir. */
      today: {
        orders: todayOrders.length,
        delivered: todayOrders.filter((order) => order.status === 'DELIVERED').length,
        routes: todayRoutes.length,
        savedMinutes: todayRoutes.reduce((total, route) => total + route.savedMinutes, 0),
      },
    };
  });
}

function toRouteView(
  route: Route,
  orderById: Map<string, Order>,
  courierName: string,
  courierWhatsappLink: string | null = null,
): RouteView {
  return {
    id: route.id,
    courierId: route.courierId,
    courierName,
    courierWhatsappLink,
    status: route.status,
    accessToken: route.accessToken.value,
    geometry: route.geometry,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    baselineDurationSeconds: route.baselineDurationSeconds,
    savedSeconds: route.savedSeconds,
    savedMinutes: route.savedMinutes,
    createdAt: route.createdAt.toISOString(),
    startedAt: route.startedAt?.toISOString() ?? null,
    stops: route.stops.map((stop) => {
      const order = orderById.get(stop.orderId);
      return {
        id: stop.id,
        orderId: stop.orderId,
        position: stop.position,
        status: stop.status,
        etaSeconds: stop.etaSeconds,
        customerName: order?.customerName ?? '—',
        address: order?.address.raw ?? '—',
        coordinates: order?.coordinates?.toJSON() ?? null,
      };
    }),
  };
}

export async function getRoute(routeId: string) {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const route = await repos.routes.findById(routeId);
    if (!route) return null;

    const establishment = await repos.establishments.current();
    const orders = await repos.orders.findManyByIds(route.stops.map((stop) => stop.orderId));
    const couriers = await repos.couriers.list();
    // 200 posições a ~15s cobrem ~50 minutos de trajeto — o suficiente para
    // desenhar a rota percorrida sem carregar o histórico inteiro a cada
    // atualização de 10 segundos.
    const trail = await repos.pings.trail(route.id, 200);

    return {
      route: toRouteView(
        route,
        new Map(orders.map((order) => [order.id, order])),
        couriers.find((courier) => courier.id === route.courierId)?.name ?? '—',
        container.whatsapp.routeLink({
          accessToken: route.accessToken.value,
          courierWhatsapp:
            couriers.find((courier) => courier.id === route.courierId)?.phone.whatsapp ?? null,
          courierName:
            couriers.find((courier) => courier.id === route.courierId)?.name ?? '',
          stops: route.stops.length,
        }),
      ),
      establishment: {
        name: establishment.name,
        coordinates: establishment.coordinates.toJSON(),
      },
      trail: trail.map((ping) => ({ ...ping.coordinates.toJSON(), at: ping.at.toISOString() })),
    };
  });
}

/**
 * Um pedido, pronto para o papel — comanda e cupom.
 *
 * Reaproveita a `OrderView` (já tem itens com opção, endereço, taxa, pagamento);
 * o troco fica de fora porque não é campo do pedido. O layout de 80mm calcula
 * subtotal e total a partir das linhas, para bater com o que a cozinha monta.
 */
export async function getPedidoParaImpressao(
  id: string,
): Promise<{ loja: string; pedido: OrderView } | null> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const order = await repos.orders.findById(id);
    if (!order) return null;
    const estabelecimento = await repos.establishments.current();

    return {
      loja: estabelecimento.name,
      pedido: toOrderView(
        order,
        container.whatsapp.dispatchLink(order, estabelecimento.name),
        container.whatsapp.trackingUrl(order),
      ),
    };
  });
}

/** Uma parada da rota, pronta para o papel do motoboy. */
export interface ParadaImpressao {
  posicao: number;
  displayId: string | null;
  cliente: string;
  telefone: string | null;
  endereco: string;
  referencia: string | null;
  pickup: boolean;
  /** "2x Pizza · 1x Coca" — o bastante para o motoboy conferir na porta. */
  itensResumo: string;
  totalCents: number;
  pagamento: OrderView['paymentMethod'];
  /** Já pago (online/Pix confirmado): o motoboy não cobra. */
  pago: boolean;
}

export interface RotaImpressao {
  loja: string;
  courier: string;
  criadoEm: string;
  paradas: ParadaImpressao[];
}

/**
 * A rota no papel — o que o motoboy leva na mão.
 *
 * As paradas em ordem, cada uma com endereço, telefone, resumo dos itens e
 * quanto receber (ou "PAGO"). Papel é o plano B do rastreio: bateria acaba, sinal
 * some, e a rota escrita não depende de nenhum dos dois.
 */
export async function getRotaParaImpressao(id: string): Promise<RotaImpressao | null> {
  const { container } = await currentContainer();

  return container.read(async (repos) => {
    const route = await repos.routes.findById(id);
    if (!route) return null;

    const estabelecimento = await repos.establishments.current();
    const courier = await repos.couriers.findById(route.courierId);
    const pedidos = await repos.orders.findManyByIds(route.stops.map((s) => s.orderId));
    const porId = new Map(pedidos.map((p) => [p.id, p]));

    const paradas: ParadaImpressao[] = [...route.stops]
      .sort((a, b) => a.position - b.position)
      .flatMap((stop) => {
        const pedido = porId.get(stop.orderId);
        if (!pedido) return [];

        const itens = pedido.items.reduce(
          (t, i) => t + i.unitPrice.cents * i.quantity - i.discount.cents,
          0,
        );
        const total = itens + (pedido.isPickup ? 0 : pedido.deliveryFee.cents);

        return [
          {
            posicao: stop.position,
            displayId: pedido.displayId,
            cliente: pedido.customerName,
            telefone: pedido.customerPhone?.value ?? null,
            endereco: pedido.address.raw,
            referencia: pedido.address.reference,
            pickup: pedido.isPickup,
            itensResumo: pedido.items.map((i) => `${i.quantity}x ${i.name}`).join(' · '),
            totalCents: total,
            pagamento: pedido.paymentMethod,
            pago: pedido.paymentStatus === 'PAID',
          },
        ];
      });

    return {
      loja: estabelecimento.name,
      courier: courier?.name ?? '—',
      criadoEm: route.createdAt.toISOString(),
      paradas,
    };
  });
}
