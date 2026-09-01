import {
  ExternalServiceError,
  type ExternalOrder,
  type ExternalOrderItem,
  type ExternalStatusChange,
  type Logger,
  type OrderSource,
} from '@/core';

interface Options {
  baseUrl?: string;
  /**
   * Devolve um token válido a cada chamada.
   *
   * O adapter não guarda credencial nem sabe renovar: no modelo distribuído o
   * token é **de um lojista**, vive no banco e expira em 6 horas. Quem cuida
   * disso é o `CredentialStore`; aqui só interessa ter um token que funcione
   * agora.
   */
  accessToken: () => Promise<string>;
  merchantId: string;
  logger?: Logger;
}

export interface CancellationReason {
  cancelCodeId: string;
  description: string;
}

interface PollingEvent {
  id: string;
  code: string;
  orderId: string;
  createdAt: string;
}

/**
 * Códigos do polling, na forma abreviada que o iFood realmente envia.
 *
 * `PLC` é o pedido novo e `CFM` o confirmado pela loja — os dois interessam,
 * porque o Levô entra depois da aceitação e a integração pode ser ligada com
 * pedidos já confirmados na fila.
 */
const PLACED_CODES = new Set(['PLC', 'CFM', 'PLACED', 'CONFIRMED']);

/** Códigos que mudam o estado de um pedido que já está aqui dentro. */
const STATUS_CODES = new Map<string, ExternalStatusChange['status']>([
  ['CON', 'CONCLUDED'],
  ['CONCLUDED', 'CONCLUDED'],
  ['CAN', 'CANCELLED'],
  ['CANCELLED', 'CANCELLED'],
  ['DSP', 'DISPATCHED'],
  ['DISPATCHED', 'DISPATCHED'],
]);

/** `CAN` é o cancelamento efetivado; `CAR`, o pedido de cancelamento. */
const CANCELLED_CODES = new Set(['CAN', 'CAR', 'CANCELLED', 'CANCELLATION_REQUESTED']);

/**
 * Adapter do iFood.
 *
 * ⚠️  **Autorização validada contra o ambiente real; pedidos ainda não.**
 *
 * O fluxo de autorização distribuído foi confirmado de ponta a ponta com uma
 * loja de teste. O consumo de pedidos continua escrito contra a documentação —
 * a homologação do Módulo de Pedidos é que fecha essa parte. Fica desligado por
 * `IFOOD_ENABLED` até lá.
 *
 * A autenticação **não** mora aqui: ver `auth.ts` para o fluxo distribuído e
 * `credential-store.ts` para a guarda e a renovação do token de cada lojista.
 *
 * ### O estado do pedido só existe nos eventos
 *
 * Verificado contra a API: `GET /orders/{id}` devolve o CONTEÚDO do pedido —
 * cliente, itens, endereço, valores — e nenhum campo de estado. Um pedido
 * concluído e um cancelado retornam payloads idênticos. Não existem
 * `/orders/{id}/status` nem `/orders/{id}/events` (ambos 404).
 *
 * Ou seja: o estado é a sequência de eventos consumidos, e evento perdido é
 * informação perdida para sempre, sem reconciliação possível. Daí duas regras
 * que não podem ser afrouxadas por conveniência:
 *
 *  1. o acknowledgment vem DEPOIS de persistir, nunca antes;
 *  2. evento de mudança de estado é processado, não descartado.
 *
 * Pontos que a documentação fixa e que o desenho respeita:
 *  • polling em `GET /events:polling` a cada 30s (não menos, sob risco de
 *    bloqueio; não mais, sob risco de perder pedido);
 *  • todo evento consumido precisa de acknowledgment, senão volta;
 *  • eventos são reentregues — a idempotência do lado de cá é obrigatória.
 */
export class IfoodOrderSource implements OrderSource {
  readonly kind = 'IFOOD' as const;

  private readonly baseUrl: string;
  /** Guardado entre `fetchPending` e `acknowledge`: id do pedido → id do evento. */
  private eventIdByOrder = new Map<string, string>();
  /**
   * Eventos que não viram pedido — cancelamento, mudança de status, tudo o que
   * não interessa à roteirização.
   *
   * Precisam de acknowledgment do mesmo jeito: evento não reconhecido volta em
   * todo polling e só some depois de 8 horas. Sem isto, a fila cresce sozinha e
   * cada ciclo relê o mesmo lixo.
   */
  private extraEventIds: string[] = [];
  /** Mudanças de estado da última leitura, entregues por `statusChanges()`. */
  private changes: ExternalStatusChange[] = [];

  constructor(private readonly options: Options) {
    this.baseUrl = (options.baseUrl ?? 'https://merchant-api.ifood.com.br').replace(/\/$/, '');
  }

  async fetchPending(): Promise<ExternalOrder[]> {
    const events = await this.request<PollingEvent[]>('GET', '/events/v1.0/events:polling');
    if (!Array.isArray(events) || events.length === 0) return [];

    /*
     * O polling devolve o código ABREVIADO — `PLC`, não `PLACED`.
     *
     * Confirmado contra o ambiente real: filtrar pelo nome por extenso, como
     * estava, descarta todos os eventos e o worker fica em silêncio, sem erro
     * nenhum, parecendo que a loja não tem pedido. Os nomes longos ficam aceitos
     * também porque a documentação os usa ao descrever o fluxo.
     */
    const relevant = events.filter((event) => PLACED_CODES.has(event.code));

    /*
     * Pedido cancelado não vira entrega.
     *
     * O cancelamento chega como evento próprio, no MESMO lote do `PLC` quando o
     * cliente desiste rápido. Sem esta verificação o motoboy sairia com uma
     * parada que já não existe — e o dono só descobriria na porta do cliente.
     */
    const cancelled = new Set(
      events.filter((event) => CANCELLED_CODES.has(event.code)).map((event) => event.orderId),
    );

    const orders: ExternalOrder[] = [];
    for (const event of relevant) {
      if (cancelled.has(event.orderId)) {
        this.extraEventIds.push(event.id);
        this.options.logger?.info({ orderId: event.orderId }, 'ifood.pedido_cancelado_ignorado');
        continue;
      }
      this.eventIdByOrder.set(event.orderId, event.id);
      try {
        orders.push(await this.fetchOrder(event.orderId, event.createdAt));
      } catch (cause) {
        // Um pedido ilegível não pode impedir os outros de entrar. Sem ack, o
        // evento volta no próximo ciclo.
        this.options.logger?.error(
          { orderId: event.orderId, cause: String(cause) },
          'ifood.order_fetch_failed',
        );
      }
    }

    /*
     * Evento que não é pedido novo pode ainda ser notícia sobre um pedido que
     * já temos: concluído, cancelado, despachado. Antes tudo isso ia direto
     * para o balde do acknowledgment e se perdia — o painel seguia mostrando
     * como pendente um pedido cancelado horas antes.
     */
    this.changes = [];
    for (const event of events) {
      if (relevant.includes(event)) continue;

      this.extraEventIds.push(event.id);

      const status = STATUS_CODES.get(event.code);
      if (status) this.changes.push({ externalId: event.orderId, status });
    }

    return orders;
  }

  /**
   * Comandos de status do pedido.
   *
   * Escrever de volta é o que separa "ler pedidos" de "operar pedidos", e o
   * iFood exige os três na homologação do módulo Order. Ficam aqui, no adapter,
   * porque são detalhe de protocolo: quem decide QUANDO acioná-los é o caso de
   * uso, não a integração.
   *
   * Nenhum deles devolve corpo — todos respondem 202 com resposta vazia.
   */
  async confirm(orderId: string): Promise<void> {
    await this.request('POST', `/order/v1.0/orders/${orderId}/confirm`);
  }

  /** O pedido saiu para entrega. No Levô, é o dono liberando a rota. */
  async dispatch(orderId: string): Promise<void> {
    await this.request('POST', `/order/v1.0/orders/${orderId}/dispatch`);
  }

  /**
   * Motivos de cancelamento aceitos PARA AQUELE PEDIDO.
   *
   * A lista não é fixa: depende do estado do pedido e de quem está pedindo o
   * cancelamento. Por isso é consultada, nunca decorada — um código inventado é
   * recusado, e o motivo certo é o que decide se o lojista leva a multa.
   */
  async cancellationReasons(orderId: string): Promise<CancellationReason[]> {
    const reasons = await this.request<CancellationReason[]>(
      'GET',
      `/order/v1.0/orders/${orderId}/cancellationReasons`,
    );
    return Array.isArray(reasons) ? reasons : [];
  }

  /**
   * Pedir cancelamento não é cancelar: quem decide é o iFood, e a resposta vem
   * depois, como evento.
   *
   * O código precisa vir de `cancellationReasons` — daí ele ser parâmetro
   * obrigatório, e não um valor padrão escondido aqui dentro.
   */
  async requestCancellation(orderId: string, reason: string, code: string): Promise<void> {
    await this.request('POST', `/order/v1.0/orders/${orderId}/requestCancellation`, {
      reason,
      cancellationCode: code,
    });
  }

  statusChanges(): ExternalStatusChange[] {
    return this.changes;
  }

  async acknowledge(externalIds: string[]): Promise<void> {
    const importedEventIds = externalIds
      .map((orderId) => this.eventIdByOrder.get(orderId))
      .filter((id): id is string => !!id);

    // Os irrelevantes vão junto: o que fica sem acknowledgment volta no próximo
    // ciclo. O que NÃO entra aqui é o evento de pedido que falhou ao ser lido —
    // esse fica na fila de propósito, para uma nova tentativa.
    const ids = [...importedEventIds, ...this.extraEventIds];
    if (ids.length === 0) return;

    await this.request(
      'POST',
      '/events/v1.0/events/acknowledgment',
      ids.map((id) => ({ id })),
    );

    for (const orderId of externalIds) this.eventIdByOrder.delete(orderId);
    this.extraEventIds = [];
  }

  private async fetchOrder(orderId: string, placedAt: string): Promise<ExternalOrder> {
    const payload = await this.request<IfoodOrder>('GET', `/order/v1.0/orders/${orderId}`);
    return mapIfoodOrder(payload, orderId, placedAt);
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.options.accessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'x-polling-merchants': this.options.merchantId,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });

    // 204 no polling significa "nada novo" — é o caso mais comum do dia.
    if (response.status === 204) return [] as T;

    if (!response.ok) {
      throw new ExternalServiceError('iFood', `HTTP ${response.status}`, { path });
    }

    /*
     * Nem toda resposta de sucesso traz corpo: o acknowledgment devolve 202
     * vazio. Chamar `.json()` nesse caso estoura com "Unexpected end of JSON
     * input" — um erro que não menciona iFood, nem acknowledgment, nem HTTP, e
     * que derrubava o ciclo inteiro DEPOIS de o pedido já ter sido importado.
     */
    const texto = await response.text();
    if (!texto) return undefined as T;

    return JSON.parse(texto) as T;
  }
}

interface IfoodOrder {
  id: string;
  displayId?: string;
  customer?: { name?: string; phone?: { number?: string } };
  delivery?: {
    deliveryAddress?: {
      formattedAddress?: string;
      streetName?: string;
      streetNumber?: string;
      neighborhood?: string;
      city?: string;
      complement?: string;
      reference?: string;
    };
  };
  total?: { orderAmount?: number };
  items?: IfoodItem[];
  payments?: { methods?: Array<{ method?: string; type?: string; prepaid?: boolean }> };
  observations?: string;
}

/**
 * Item do pedido. O iFood aninha em três níveis — item, complemento e
 * customização do complemento — e `totalPrice` do item já soma os três.
 */
interface IfoodItem {
  name?: string;
  quantity?: number;
  totalPrice?: number;
  price?: number;
  observations?: string;
  options?: Array<{
    name?: string;
    customizations?: Array<{ name?: string }>;
  }>;
}

/**
 * Mapeia o pedido do iFood para o formato do domínio.
 *
 * Exportado para poder ser testado sem rede — é aqui que mora o risco real do
 * adapter, já que a chamada HTTP é trivial e o mapeamento é o que quebra
 * quando a plataforma muda um campo.
 */
export function mapIfoodOrder(
  payload: IfoodOrder,
  fallbackId: string,
  placedAt: string,
): ExternalOrder {
  const address = payload.delivery?.deliveryAddress;

  const formatted =
    address?.formattedAddress ??
    [
      [address?.streetName, address?.streetNumber].filter(Boolean).join(', '),
      address?.neighborhood,
      address?.city,
    ]
      .filter(Boolean)
      .join(' - ');

  const itens = mapItens(payload.items ?? []);

  // O iFood envia valores em reais, com decimais. Centavos são a moeda do
  // domínio: arredondar aqui evita float atravessando o sistema.
  const totalCents = Math.max(0, Math.round((payload.total?.orderAmount ?? 0) * 100));

  return {
    externalId: payload.id ?? fallbackId,
    displayId: payload.displayId?.trim() || undefined,
    customerName: payload.customer?.name?.trim() || 'Cliente iFood',
    customerPhone: payload.customer?.phone?.number ?? null,
    address: formatted,
    reference: address?.complement ?? address?.reference ?? null,
    amountCents: totalCents,
    notes: payload.observations?.trim() || null,
    placedAt: new Date(placedAt),
    items: itens.length > 0 ? itens : undefined,
    deliveryFeeCents: itens.length > 0 ? taxaQueFechaOTotal(itens, totalCents) : undefined,
    paymentMethod: mapPagamento(payload.payments?.methods ?? []),
  };
}

/**
 * A diferença entre o total e a soma dos itens.
 *
 * Não é só a taxa de entrega: o iFood cobra `additionalFees` por fora, e com
 * itens o domínio deriva o total deles mais a taxa. Se mandássemos só o
 * `deliveryFee` de lá, o nosso total ficaria alguns centavos abaixo do que o
 * cliente pagou — e nada no painel explicaria a diferença.
 *
 * Mandar a diferença inteira faz a conta fechar sempre, inclusive absorvendo o
 * arredondamento de cada linha. O piso em zero é para o caso de desconto maior
 * que as taxas: raro, porque promoção de marketplace costuma ser bancada por
 * ele, e o alternativo seria uma taxa negativa que o domínio não representa.
 */
function taxaQueFechaOTotal(itens: ExternalOrderItem[], totalCents: number): number {
  const soma = itens.reduce((t, i) => t + i.unitPriceCents * i.quantity, 0);
  return Math.max(0, totalCents - soma);
}

/**
 * Achata os três níveis do iFood numa linha por item.
 *
 * `totalPrice` já inclui complementos e customizações, então eles vão numa
 * LISTA ao lado do item, não como linhas próprias — linha própria contaria o
 * dinheiro duas vezes. Eles já estiveram concatenados no nome, e um combo
 * virava um parágrafo de sete linhas que ninguém conferia.
 */
function mapItens(items: IfoodItem[]): ExternalOrderItem[] {
  return items.map((item) => {
    const extras = (item.options ?? []).flatMap((opcao) => [
      opcao.name?.trim(),
      ...(opcao.customizations ?? []).map((c) => c.name?.trim()),
    ]);

    const base = item.name?.trim() || 'Item';
    const observacao = item.observations?.trim();

    const quantidade = Math.max(1, Math.round(item.quantity ?? 1));
    /*
     * Piso em zero: o domínio não representa dinheiro negativo, e uma linha de
     * ajuste com valor negativo faria o pedido inteiro ser recusado na
     * importação. Perder o preço de um item é ruim; perder o pedido é pior — e
     * a diferença reaparece na taxa, que é o que fecha o total.
     */
    const linhaCents = Math.max(0, Math.round((item.totalPrice ?? item.price ?? 0) * 100));

    return {
      name: base,
      // A observação do cliente entra junto dos complementos: para quem monta o
      // pedido, "sem cebola" e "molho extra" são a mesma categoria de instrução.
      options: [...extras.filter((x): x is string => Boolean(x)), ...(observacao ? [observacao] : [])],
      quantity: quantidade,
      // `totalPrice` é da linha inteira. O domínio guarda unitário e multiplica
      // de volta, então dividimos aqui — a sobra do arredondamento é absorvida
      // pela taxa, que é a diferença até o total.
      unitPriceCents: Math.round(linhaCents / quantidade),
    };
  });
}

/**
 * Como o cliente pagou.
 *
 * Pré-pago vira `ONLINE` seja qual for o meio: para quem entrega, o que importa
 * é que não há nada a receber na porta. Cartão na maquininha e dinheiro
 * precisam do meio certo, porque o motoboy sai preparado para eles.
 */
function mapPagamento(
  methods: Array<{ method?: string; type?: string; prepaid?: boolean }>,
): ExternalOrder['paymentMethod'] {
  const primeiro = methods[0];
  if (!primeiro) return undefined;
  if (primeiro.prepaid || primeiro.type === 'ONLINE') return 'ONLINE';

  return (
    { CASH: 'CASH', CREDIT: 'CREDIT', DEBIT: 'DEBIT', PIX: 'PIX' } as const
  )[primeiro.method ?? ''];
}
