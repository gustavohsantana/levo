import {
  ExternalServiceError,
  type ExternalOrder,
  type Logger,
  type OrderSource,
} from '@/core';

interface Options {
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
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
 * Adapter do iFood.
 *
 * ⚠️  **Escrito contra a documentação, ainda não homologado.**
 *
 * O acesso à API exige conta profissional com CNPJ e aprovação no processo de
 * homologação do Módulo de Pedidos — não existe caminho de sandbox aberto que
 * permita validar isto de ponta a ponta antes do credenciamento. O código está
 * aqui, tipado e testado no mapeamento, para que ligar seja questão de
 * preencher credenciais e conferir contra o ambiente real. Fica desligado por
 * `IFOOD_ENABLED` até lá.
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
  private token: { value: string; expiresAt: number } | null = null;
  /** Guardado entre `fetchPending` e `acknowledge`: id do pedido → id do evento. */
  private eventIdByOrder = new Map<string, string>();

  constructor(private readonly options: Options) {
    this.baseUrl = (options.baseUrl ?? 'https://merchant-api.ifood.com.br').replace(/\/$/, '');
  }

  async fetchPending(): Promise<ExternalOrder[]> {
    const events = await this.request<PollingEvent[]>('GET', '/events/v1.0/events:polling');
    if (!Array.isArray(events) || events.length === 0) return [];

    // Só interessam pedidos confirmados como despachados para entrega própria.
    const relevant = events.filter((event) => event.code === 'PLACED' || event.code === 'CONFIRMED');

    const orders: ExternalOrder[] = [];
    for (const event of relevant) {
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

    return orders;
  }

  async acknowledge(externalIds: string[]): Promise<void> {
    const events = externalIds
      .map((orderId) => this.eventIdByOrder.get(orderId))
      .filter((id): id is string => !!id)
      .map((id) => ({ id }));

    if (events.length === 0) return;

    await this.request('POST', '/events/v1.0/events/acknowledgment', events);
    for (const orderId of externalIds) this.eventIdByOrder.delete(orderId);
  }

  private async fetchOrder(orderId: string, placedAt: string): Promise<ExternalOrder> {
    const payload = await this.request<IfoodOrder>('GET', `/order/v1.0/orders/${orderId}`);
    return mapIfoodOrder(payload, orderId, placedAt);
  }

  /** OAuth2 client credentials, com o token reaproveitado até faltar 1 min. */
  private async authorize(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const body = new URLSearchParams({
      grantType: 'client_credentials',
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
    });

    const response = await fetch(`${this.baseUrl}/authentication/v1.0/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new ExternalServiceError('iFood', `autenticação falhou (HTTP ${response.status})`);
    }

    const payload = (await response.json()) as { accessToken: string; expiresIn: number };
    this.token = {
      value: payload.accessToken,
      expiresAt: Date.now() + payload.expiresIn * 1000,
    };

    return this.token.value;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.authorize();

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

    return (await response.json()) as T;
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
