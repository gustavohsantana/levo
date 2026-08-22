import {
  ExternalServiceError,
  type ExternalOrder,
  type Logger,
  type OrderSource,
} from '@/core';

interface Options {
  baseUrl?: string;
  apiKey: string;
  merchantId: string;
  logger?: Logger;
}

interface AiqfomeOrder {
  id: string | number;
  cliente?: { nome?: string; telefone?: string };
  entrega?: {
    endereco?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    complemento?: string;
    referencia?: string;
  };
  valor_total?: number;
  observacao?: string;
  criado_em?: string;
}

/**
 * Adapter do aiqfome.
 *
 * ⚠️  **Escrito contra a documentação pública, ainda não homologado.**
 *
 * Assim como o iFood, o acesso passa por credenciamento de parceiro
 * desenvolvedor (API V2 / ID Magalu). Desligado por `AIQFOME_ENABLED`.
 *
 * O contrato de campos é mais fluido que o do iFood, então o mapeamento aceita
 * tanto o endereço já formatado quanto os campos separados — o que for vier.
 */
export class AiqfomeOrderSource implements OrderSource {
  readonly kind = 'AIQFOME' as const;

  private readonly baseUrl: string;

  constructor(private readonly options: Options) {
    this.baseUrl = (options.baseUrl ?? 'https://api.aiqfome.com/v2').replace(/\/$/, '');
  }

  async fetchPending(): Promise<ExternalOrder[]> {
    const response = await fetch(
      `${this.baseUrl}/merchants/${this.options.merchantId}/orders?status=pendente`,
      {
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (response.status === 204) return [];
    if (!response.ok) {
      throw new ExternalServiceError('aiqfome', `HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { pedidos?: AiqfomeOrder[] } | AiqfomeOrder[];
    const orders = Array.isArray(payload) ? payload : (payload.pedidos ?? []);

    return orders.map(mapAiqfomeOrder);
  }

  async acknowledge(externalIds: string[]): Promise<void> {
    for (const externalId of externalIds) {
      try {
        await fetch(
          `${this.baseUrl}/merchants/${this.options.merchantId}/orders/${externalId}/ack`,
          {
            method: 'POST',
            headers: { authorization: `Bearer ${this.options.apiKey}` },
            signal: AbortSignal.timeout(15_000),
          },
        );
      } catch (cause) {
        // Falhar o ack só faz o pedido voltar no próximo ciclo, onde a
        // idempotência o descarta. Não vale derrubar a importação por isso.
        this.options.logger?.warn({ externalId, cause: String(cause) }, 'aiqfome.ack_failed');
      }
    }
  }
}

export function mapAiqfomeOrder(payload: AiqfomeOrder): ExternalOrder {
  const delivery = payload.entrega;

  const formatted =
    delivery?.endereco ??
    [
      [delivery?.logradouro, delivery?.numero].filter(Boolean).join(', '),
      delivery?.bairro,
      delivery?.cidade,
    ]
      .filter(Boolean)
      .join(' - ');

  return {
    externalId: String(payload.id),
    customerName: payload.cliente?.nome?.trim() || 'Cliente aiqfome',
    customerPhone: payload.cliente?.telefone ?? null,
    address: formatted,
    reference: delivery?.complemento ?? delivery?.referencia ?? null,
    amountCents: Math.round((payload.valor_total ?? 0) * 100),
    notes: payload.observacao?.trim() || null,
    placedAt: payload.criado_em ? new Date(payload.criado_em) : new Date(),
  };
}
