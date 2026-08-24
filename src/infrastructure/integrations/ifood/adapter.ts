import {
  ExternalServiceError,
  type ExternalOrder,
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

    // Tudo o que não era pedido novo também precisa sair da fila.
    for (const event of events) {
      if (!relevant.includes(event)) this.extraEventIds.push(event.id);
    }

    return orders;
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
  observations?: string;
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

  return {
    externalId: payload.id ?? fallbackId,
    customerName: payload.customer?.name?.trim() || 'Cliente iFood',
    customerPhone: payload.customer?.phone?.number ?? null,
    address: formatted,
    reference: address?.complement ?? address?.reference ?? null,
    // O iFood envia o total em reais, com decimais. Centavos são a moeda do
    // domínio: arredondar aqui evita float atravessando o sistema.
    amountCents: Math.round((payload.total?.orderAmount ?? 0) * 100),
    notes: payload.observations?.trim() || null,
    placedAt: new Date(placedAt),
  };
}
