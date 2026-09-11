import { ExternalServiceError, type Logger } from '@/core';

/**
 * O módulo Merchant do iFood — gerir a loja de dentro do Levô.
 *
 * Separado do adapter de pedidos de propósito: pedido é `/order` e `/events`,
 * loja é `/merchant`. Mesma base, mesmo token de lojista (do `CredentialStore`),
 * caminhos diferentes. O que aqui muda reflete no Portal do Parceiro — é isso
 * que a homologação do iFood exige provar.
 *
 * As formas de resposta são o que a doc descreve; a homologação roda contra o
 * sandbox do app de teste, e é lá que a gente confirma cada campo com o iFood
 * respondendo de verdade.
 */

const BASE_PADRAO = 'https://merchant-api.ifood.com.br';

export interface LojaIfood {
  id: string;
  name: string;
  /** "AVAILABLE" quando pode receber pedido agora. */
  status?: string;
  [k: string]: unknown;
}

/** Uma pausa (interrupção) da loja: fecha por uma janela de tempo. */
export interface PausaIfood {
  id: string;
  description: string;
  /** ISO 8601, ex.: 2026-09-20T14:00:00.000Z. */
  start: string;
  end: string;
}

/** Um turno de funcionamento: dia, início e duração em minutos. */
export interface TurnoIfood {
  /** MONDAY … SUNDAY. */
  dayOfWeek: string;
  /** "HH:MM:SS". */
  start: string;
  /** Minutos a partir de `start`. 10h→19h = 540. */
  duration: number;
}

export class IfoodMerchant {
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      /** Token válido de UM lojista, do `CredentialStore`. Expira em ~6h. */
      accessToken: () => Promise<string>;
      logger?: Logger;
      baseUrl?: string;
    },
  ) {
    this.baseUrl = opts.baseUrl ?? BASE_PADRAO;
  }

  // ---- Cenário 1: informações da loja ----

  /** Todas as lojas vinculadas a este token. */
  listarLojas(): Promise<LojaIfood[]> {
    return this.req<LojaIfood[]>('GET', '/merchant/v1.0/merchants');
  }

  /** Detalhes completos de uma loja. */
  detalhes(merchantId: string): Promise<LojaIfood> {
    return this.req<LojaIfood>('GET', `/merchant/v1.0/merchants/${merchantId}`);
  }

  /** Disponibilidade agora — se pode receber pedido. */
  status(merchantId: string): Promise<unknown> {
    return this.req('GET', `/merchant/v1.0/merchants/${merchantId}/status`);
  }

  // ---- Cenário 2: interrupções (pausas) ----

  criarPausa(
    merchantId: string,
    pausa: { description: string; start: string; end: string },
  ): Promise<PausaIfood> {
    return this.req<PausaIfood>(
      'POST',
      `/merchant/v1.0/merchants/${merchantId}/interruptions`,
      pausa,
    );
  }

  listarPausas(merchantId: string): Promise<PausaIfood[]> {
    return this.req<PausaIfood[]>(
      'GET',
      `/merchant/v1.0/merchants/${merchantId}/interruptions`,
    );
  }

  removerPausa(merchantId: string, interrupcaoId: string): Promise<void> {
    return this.req<void>(
      'DELETE',
      `/merchant/v1.0/merchants/${merchantId}/interruptions/${interrupcaoId}`,
    );
  }

  // ---- Cenário 3: horário de funcionamento ----

  horarios(merchantId: string): Promise<{ shifts: TurnoIfood[] }> {
    return this.req<{ shifts: TurnoIfood[] }>(
      'GET',
      `/merchant/v1.0/merchants/${merchantId}/opening-hours`,
    );
  }

  /** Substitui TODOS os horários: dia de fora do array some da agenda. */
  definirHorarios(merchantId: string, shifts: TurnoIfood[]): Promise<void> {
    return this.req<void>(
      'PUT',
      `/merchant/v1.0/merchants/${merchantId}/opening-hours`,
      { storeId: merchantId, shifts },
    );
  }

  private async req<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.opts.accessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => '');
      this.opts.logger?.warn({ path, status: response.status, detalhe }, 'ifood.merchant_falhou');
      throw new ExternalServiceError('iFood', `HTTP ${response.status}`, { path });
    }

    // 204 (delete/put) e respostas vazias não têm corpo para desserializar.
    const texto = await response.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  }
}
