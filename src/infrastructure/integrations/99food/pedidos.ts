import JSONbig from 'json-bigint';
import { ExternalServiceError, type Logger } from '@/core';
import { comToken, type Food99Auth } from './auth';

/**
 * O módulo de Pedidos do 99Food — o que a homologação realmente cobra.
 *
 * Ao contrário do iFood e do aiqfome, aqui o cardápio e a loja não bloqueiam o
 * go-live: a lista "Before Going Live" deles é quase toda sobre pedido. Por isso
 * este arquivo vem antes de loja e cardápio.
 *
 * Duas regras atravessam tudo o que está aqui:
 *
 * 1. **Id é string, sempre.** `order_id` é long de 64 bits, e passar por
 *    `number` o arredonda — confirmar o pedido 5764617763114451489 viraria
 *    confirmar o 5764617763114452000, que não existe. Medido: 511 de diferença.
 *
 * 2. **HTTP 200 não quer dizer sucesso.** A plataforma devolve 200 com
 *    `errno` diferente de zero para erro de negócio.
 */

const BASE_PADRAO = 'https://openapi.didi-food.com';

/** Preserva os ids grandes. Ver [[99food-api]]. */
const leitor = JSONbig({ storeAsString: true });

interface RespostaPadrao<T> {
  errno: number;
  errmsg?: string;
  /** O id da chamada. O suporte deles pede este número. */
  requestId?: string;
  data?: T;
}

/** Motivo de recusa/cancelamento, como a plataforma espera. */
export interface MotivoCancelamento {
  /** Código do motivo no catálogo deles. */
  reasonId?: number;
  /** Texto livre, quando o código não cobre o caso. */
  reason?: string;
}

export class Food99Pedidos {
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      auth: Food99Auth;
      /** O id da loja no NOSSO sistema — o mesmo usado no vínculo. */
      appShopId: string;
      logger?: Logger;
      baseUrl?: string;
    },
  ) {
    this.baseUrl = (opts.baseUrl ?? BASE_PADRAO).replace(/\/$/, '');
  }

  /**
   * O pedido inteiro. É daqui que saem `order_id` e `order_index` (a
   * homologação exige exibir os dois, inclusive no cupom), a estrutura de
   * preço, as promoções e o `shop_paid_money` das lojas que aceitam dinheiro.
   *
   * Devolve cru de propósito: a forma muda conforme a loja seja de entrega do
   * 99Food ou entrega própria, e achatar isso aqui esconderia justamente a
   * diferença que a homologação manda tratar.
   */
  detalhe(orderId: string): Promise<unknown> {
    return this.req('GET', '/v1/order/order/detail', { order_id: orderId });
  }

  /** Aceita o pedido. Obrigatório na homologação. */
  confirmar(orderId: string): Promise<unknown> {
    return this.req('POST', '/v1/order/order/confirm', { order_id: orderId });
  }

  /** Recusa ou cancela. */
  cancelar(orderId: string, motivo: MotivoCancelamento = {}): Promise<unknown> {
    return this.req('POST', '/v1/order/order/cancel', {
      order_id: orderId,
      ...(motivo.reasonId !== undefined ? { reason_id: motivo.reasonId } : {}),
      ...(motivo.reason ? { reason: motivo.reason } : {}),
    });
  }

  /** Avisa que saiu da cozinha. `GET` — é a API deles que define. */
  pronto(orderId: string): Promise<unknown> {
    return this.req('GET', '/v1/order/order/ready', { order_id: orderId });
  }

  /** Fecha o pedido. Só para loja com entrega própria. */
  entregue(orderId: string): Promise<unknown> {
    return this.req('GET', '/v1/order/order/delivered', { order_id: orderId });
  }

  /** Responde ao pedido de cancelamento feito pelo cliente. */
  responderCancelamento(orderId: string, aceitar: boolean): Promise<unknown> {
    return this.req('POST', '/v1/order/apply/cancel', {
      order_id: orderId,
      // 1 = concorda, 2 = recusa.
      agree: aceitar ? 1 : 2,
    });
  }

  /** Responde ao pedido de reembolso por item faltando. */
  responderReembolso(orderId: string, aceitar: boolean): Promise<unknown> {
    return this.req('POST', '/v1/order/apply/refund', {
      order_id: orderId,
      agree: aceitar ? 1 : 2,
    });
  }

  private async req(
    metodo: 'GET' | 'POST',
    caminho: string,
    params: Record<string, string | number>,
  ): Promise<unknown> {
    const { authToken } = await this.opts.auth.token(this.opts.appShopId);

    const url = comToken(new URL(`${this.baseUrl}${caminho}`), authToken);
    url.searchParams.set('app_shop_id', this.opts.appShopId);

    /*
     * Mesmo no POST os parâmetros vão na query.
     *
     * Não é preferência: o `auth_token` já viaja assim, e misturar query com
     * corpo nesta API é onde ela costuma responder "parâmetro ausente" sem
     * dizer qual. Manter tudo num lugar só tira a dúvida.
     */
    for (const [chave, valor] of Object.entries(params)) {
      url.searchParams.set(chave, String(valor));
    }

    const resposta = await fetch(url, {
      method: metodo,
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    const texto = await resposta.text();

    if (!resposta.ok) {
      throw new ExternalServiceError('99Food', `HTTP ${resposta.status}`, {
        path: caminho,
        status: resposta.status,
      });
    }

    const corpo = leitor.parse(texto) as RespostaPadrao<unknown>;

    if (corpo.errno !== 0) {
      /*
       * O `requestId` entra no erro porque é o que o suporte deles cobra para
       * investigar — e descobrir que ele existia só depois do incidente é tarde.
       */
      this.opts.logger?.warn(
        { path: caminho, errno: corpo.errno, requestId: corpo.requestId },
        '99food.pedido_falhou',
      );
      throw new ExternalServiceError('99Food', corpo.errmsg ?? `errno ${corpo.errno}`, {
        path: caminho,
        errno: corpo.errno,
        requestId: corpo.requestId,
      });
    }

    return corpo.data;
  }
}
