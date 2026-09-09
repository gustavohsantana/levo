import {
  ExternalServiceError,
  type ExternalOrder,
  type Logger,
  type OrderSource,
} from '@/core';

interface Options {
  baseUrl?: string;
  /**
   * Função, não valor: o token dura 7200 s e é renovado pelo `refresh_token`,
   * então um `string` fixo aqui envelheceria em silêncio no meio do turno.
   */
  accessToken: () => Promise<string>;
  /** `id` numérico da loja no aiqfome — o que vai em `filter[store_ids]`. */
  storeId: string;
  /** Identifica o parceiro nos logs deles; a plataforma pede no `User-Agent`. */
  contact?: string;
  logger?: Logger;
}

/*
 * Recortes do pedido da API V2, conferidos contra o exemplo publicado em
 * developer.aiqfome.com/docs/api/v2/show-order. Só o que o Levô usa: o payload
 * completo tem itens, cupons, avaliação e histórico de entrega da aiqentrega.
 */
interface AiqfomeOrder {
  id: number;
  created_at?: string;
  is_pickup?: boolean;
  order_observations?: string;
  user?: {
    name?: string;
    surname?: string;
    mobile_phone?: string;
    phone_number?: string;
    address?: AiqfomeAddress | string | null;
  };
  payment_method?: { total?: string | number };
  timeline?: { created_at?: string; timezone?: string };
}

/*
 * O que a **lista** devolve, que não é o que o detalhe devolve.
 *
 * A documentação só publica o formato do `show-order`; o de `/api/v2/orders`
 * foi lido do ambiente real e usa outros nomes — `order_id` no lugar de `id`,
 * `order_is_pickup` no lugar de `is_pickup` — e não traz endereço nem valor.
 * Por isso a importação lista e depois busca cada pedido: sem o detalhe não há
 * como montar uma parada.
 *
 * Os dois nomes ficam aceitos porque a divergência é provavelmente um descuido
 * deles, e o dia em que alinharem não pode quebrar a importação.
 */
interface AiqfomeOrderSummary {
  order_id?: number;
  id?: number;
  order_is_pickup?: boolean;
  is_pickup?: boolean;
}

interface AiqfomeAddress {
  street?: string;
  number?: string | number;
  neighborhood?: string;
  city?: string;
  complement?: string;
  reference?: string;
  zip_code?: string;
}

/**
 * Adapter do aiqfome, API V2.
 *
 * Os endereços vêm da documentação oficial e do gateway real:
 *
 *     GET  /api/v2/orders?filter[store_ids]=…   pedidos não lidos (resumo)
 *     GET  /api/v2/orders/:id                   o pedido inteiro
 *     POST /api/v2/orders/mark-as-read          { order_id }
 *
 * O token é **por loja**: o lojista autoriza o aplicativo em cada loja dele, e
 * cada uma tem o seu. Uma credencial de parceiro (`client_credentials`) passa
 * pelo gateway e é recusada pela API com 401 — ela identifica o aplicativo, não
 * a loja. Ver `AiqfomeOAuth`.
 *
 * ⚠️  O formato do endereço não está confirmado: no exemplo publicado o pedido
 * é de retirada e `user.address` vem `null`. O mapeamento aceita tanto string
 * pronta quanto campos separados, e um endereço vazio vira erro visível na
 * importação em vez de uma parada sem rua.
 */
export class AiqfomeOrderSource implements OrderSource {
  readonly kind = 'AIQFOME' as const;

  private readonly baseUrl: string;

  constructor(private readonly options: Options) {
    this.baseUrl = (options.baseUrl ?? 'https://plataforma.aiqfome.com').replace(/\/$/, '');
  }

  async fetchPending(): Promise<ExternalOrder[]> {
    const url = new URL('/api/v2/orders', this.baseUrl);
    url.searchParams.set('filter[store_ids]', this.options.storeId);

    const resumos = await this.get<AiqfomeOrderSummary[]>(url);
    const pedidos: ExternalOrder[] = [];

    for (const resumo of resumos) {
      /*
       * A retirada entra também, marcada como tal.
       *
       * Antes era pulada — mas isso obrigava o dono a vigiar o app do aiqfome
       * para os pedidos de balcão, e o Levô existe justamente para centralizar
       * tudo num lugar só. Ela aparece no painel e na cozinha; o que não vira é
       * rota, porque não há entrega (`Order` já trata `isPickup`).
       */
      const id = resumo.order_id ?? resumo.id;
      if (id === undefined) continue;

      const detalhe = await this.get<AiqfomeOrder>(
        new URL(`/api/v2/orders/${id}`, this.baseUrl),
      );

      if (detalhe) {
        const pedido = mapAiqfomeOrder(detalhe);
        // O resumo é a fonte autoritativa da retirada — o detalhe nem sempre
        // repete o flag. Se o resumo diz balcão, é balcão.
        if (resumo.order_is_pickup ?? resumo.is_pickup) pedido.pickup = true;
        pedidos.push(pedido);
      }
    }

    return pedidos;
  }

  /**
   * `T[]` quando a rota lista, `T` quando ela mostra um só — a API embrulha os
   * dois em `data`, e `204` significa nada a fazer.
   */
  private async get<T>(url: URL): Promise<T extends unknown[] ? T : T> {
    const response = await fetch(url, {
      headers: await this.headers(),
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status === 204) return [] as never;
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ExternalServiceError(
        'aiqfome',
        `HTTP ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const payload = (await response.json()) as { data?: unknown };
    return (payload.data ?? []) as never;
  }

  async acknowledge(externalIds: string[]): Promise<void> {
    if (externalIds.length === 0) return;

    const headers = { ...(await this.headers()), 'content-type': 'application/json' };

    for (const externalId of externalIds) {
      try {
        await fetch(new URL('/api/v2/orders/mark-as-read', this.baseUrl), {
          method: 'POST',
          headers,
          body: JSON.stringify({ order_id: Number(externalId) }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (cause) {
        // Falhar o ack só faz o pedido voltar no próximo ciclo, onde a
        // idempotência o descarta. Não vale derrubar a importação por isso.
        this.options.logger?.warn({ externalId, cause: String(cause) }, 'aiqfome.ack_failed');
      }
    }
  }

  /** Pronto para o entregador retirar. */
  async markReady(externalOrderId: string): Promise<void> {
    await this.comando('mark-as-ready', externalOrderId);
  }

  /**
   * Avisa a plataforma que o pedido chegou ao cliente.
   *
   * Não existe "saiu para entrega" aqui: em loja de cardápio o aiqfome vai de
   * pronto direto para entregue — tentar `mark-as-in-separation` responde 409
   * dizendo que só loja de catálogo separa. Por isso `dispatch` fica de fora.
   */
  async markDelivered(externalOrderId: string): Promise<void> {
    await this.comando('mark-as-delivered', externalOrderId);
  }

  /** Os comandos de pedido têm todos a mesma forma: POST com `order_id`. */
  private async comando(rota: string, externalOrderId: string): Promise<void> {
    const resposta = await fetch(new URL(`/api/v2/orders/${rota}`, this.baseUrl), {
      method: 'POST',
      headers: { ...(await this.headers()), 'content-type': 'application/json' },
      body: JSON.stringify({ order_id: Number(externalOrderId) }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      throw new ExternalServiceError(
        'aiqfome',
        `HTTP ${resposta.status}${detalhe ? ` — ${detalhe.slice(0, 200)}` : ''}`,
      );
    }
  }

  private async headers(): Promise<Record<string, string>> {
    return {
      authorization: `Bearer ${await this.options.accessToken()}`,
      accept: 'application/json',
      'user-agent': `Levo (${this.options.contact ?? 'contato@levoentregas.com.br'})`,
    };
  }
}

export function mapAiqfomeOrder(payload: AiqfomeOrder): ExternalOrder {
  const user = payload.user;
  const endereco = user?.address;

  const nome = [user?.name, user?.surname].filter(Boolean).join(' ').trim();

  return {
    externalId: String(payload.id),
    customerName: nome || 'Cliente aiqfome',
    customerPhone: user?.mobile_phone ?? user?.phone_number ?? null,
    address: formatAddress(endereco),
    reference:
      typeof endereco === 'object' && endereco
        ? (endereco.complement ?? endereco.reference ?? null)
        : null,
    amountCents: toCents(payload.payment_method?.total),
    notes: payload.order_observations?.trim() || null,
    pickup: payload.is_pickup ?? false,
    placedAt: parseDate(
      payload.timeline?.created_at ?? payload.created_at,
      payload.timeline?.timezone,
    ),
  };
}

function formatAddress(endereco: AiqfomeAddress | string | null | undefined): string {
  if (typeof endereco === 'string') return endereco;
  if (!endereco) return '';

  return [
    [endereco.street, endereco.number].filter(Boolean).join(', '),
    endereco.neighborhood,
    endereco.city,
  ]
    .filter(Boolean)
    .join(' - ');
}

/**
 * O total vem como string — `"330.97"` — e virar centavos por multiplicação
 * direta erra por um centavo em alguns valores, porque 330.97 não existe em
 * binário. Arredondar depois de multiplicar resolve, e é dinheiro: não é o
 * lugar de confiar na sorte do ponto flutuante.
 */
function toCents(total: string | number | undefined): number {
  const valor = typeof total === 'string' ? Number.parseFloat(total) : (total ?? 0);
  return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
}

/**
 * As datas vêm sem fuso — `"2023-06-15 15:43:03"` — e o fuso da loja vem à
 * parte, em `timeline.timezone`. Deixar o `Date` adivinhar faz o servidor, que
 * roda em UTC, ler esse horário como três horas mais cedo do que foi.
 *
 * Já pagamos por isso uma vez: pedido feito às 15:02 aparecia às 18:02 no
 * painel, e ninguém desconfia de um relógio que mostra um horário plausível.
 */
function parseDate(texto: string | undefined, timeZone = 'America/Sao_Paulo'): Date {
  if (!texto) return new Date();

  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!partes) {
    const solto = new Date(texto);
    return Number.isNaN(solto.getTime()) ? new Date() : solto;
  }

  const [, ano, mes, dia, hora, minuto, segundo] = partes.map(Number) as unknown as number[];
  const comoSeFosseUtc = Date.UTC(ano, mes - 1, dia, hora, minuto, segundo);

  /*
   * Descobre o deslocamento invertendo a conversão: formata o instante no fuso
   * da loja e mede o quanto ele andou. Evita tabela de fusos e acompanha
   * mudanças de horário de verão sem depender de biblioteca.
   */
  try {
    const formatador = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const campos = Object.fromEntries(
      formatador.formatToParts(new Date(comoSeFosseUtc)).map((p) => [p.type, p.value]),
    );

    const devolta = Date.UTC(
      Number(campos.year),
      Number(campos.month) - 1,
      Number(campos.day),
      Number(campos.hour) % 24,
      Number(campos.minute),
      Number(campos.second),
    );

    return new Date(comoSeFosseUtc - (devolta - comoSeFosseUtc));
  } catch {
    // Fuso desconhecido: melhor o horário sem conversão do que estourar a
    // importação inteira por causa de um campo.
    return new Date(comoSeFosseUtc);
  }
}
