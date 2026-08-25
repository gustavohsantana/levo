import {
  ExternalServiceError,
  type ExternalOrder,
  type Logger,
  type OrderSource,
} from '@/core';

interface Options {
  baseUrl?: string;
  /**
   * Função, não valor: o token do aiqfome dura duas horas e é trocado por um
   * novo, então um `string` fixo aqui envelheceria em silêncio no meio do
   * expediente. Ver `AiqfomeTokenProvider`.
   */
  accessToken: () => Promise<string>;
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
 * ⚠️  **A autenticação está verificada; os caminhos dos recursos não.**
 *
 * O que foi confirmado contra o ambiente real: o token de parceiro
 * (`client_credentials`, escopos `aqf:order:read` entre outros) e o gateway em
 * `merchant-api.aiqfome.com`, um Kong à frente de um serviço uvicorn. Sondando
 * o gateway, `/store/v1/store…` responde como aplicação; os demais prefixos
 * respondem "no Route matched", que é o gateway recusando antes de chegar lá.
 *
 * Os caminhos abaixo, esses continuam vindo da documentação pública e **não**
 * foram exercitados. Adivinhar rota em API de terceiro rende 404 indistinguível
 * de permissão faltando, então eles ficam configuráveis por `AIQFOME_BASE_URL`
 * e mudam quando o credenciamento sair — sem tocar no resto.
 *
 * Desligado por `AIQFOME_ENABLED`.
 *
 * O contrato de campos é mais fluido que o do iFood, então o mapeamento aceita
 * tanto o endereço já formatado quanto os campos separados — o que vier.
 */
export class AiqfomeOrderSource implements OrderSource {
  readonly kind = 'AIQFOME' as const;

  private readonly baseUrl: string;

  constructor(private readonly options: Options) {
    this.baseUrl = (options.baseUrl ?? 'https://merchant-api.aiqfome.com').replace(/\/$/, '');
  }

  async fetchPending(): Promise<ExternalOrder[]> {
    const token = await this.options.accessToken();

    const response = await fetch(
      `${this.baseUrl}/merchants/${this.options.merchantId}/orders?status=pendente`,
      {
        headers: {
          authorization: `Bearer ${token}`,
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
    if (externalIds.length === 0) return;

    const token = await this.options.accessToken();

    for (const externalId of externalIds) {
      try {
        await fetch(
          `${this.baseUrl}/merchants/${this.options.merchantId}/orders/${externalId}/ack`,
          {
            method: 'POST',
            headers: { authorization: `Bearer ${token}` },
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
