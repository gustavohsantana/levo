import type {
  ExternalOrder,
  ExternalOrderItem,
  Logger,
  OrderFulfillment,
  OrderSource,
} from '@/core';
import type { Food99Pedidos } from './pedidos';

/**
 * Importador de pedidos do 99Food.
 *
 * Difere do iFood e do aiqfome num ponto estrutural: **não existe endpoint para
 * listar pedidos pendentes**. A plataforma só empurra por webhook. Então a fila
 * de entrada aqui é a nossa própria tabela de eventos — a rota do webhook anota
 * (em 6 segundos, que é o teto deles), e este adapter lê o que foi anotado e
 * busca o pedido inteiro.
 *
 * Consequência prática: evento perdido é pedido perdido. É por isso que a rota
 * responde `errno: 1` em qualquer falha nossa — para o 99Food reenviar — e é por
 * isso que o `acknowledge` só carimba o evento depois de o pedido estar gravado.
 */

/** Uma linha da fila de entrada, já sem o que o adapter não usa. */
export interface EventoPendenteFood99 {
  /** O id da linha em `IntegrationEvent`, para carimbar depois. */
  id: string;
  /** O tipo do evento, como o 99Food o nomeou. */
  code: string;
  externalOrderId: string;
}

/**
 * A fila de eventos, como uma porta.
 *
 * O adapter poderia falar com o Prisma direto — ele é infraestrutura, seria
 * legítimo. Mas então testar o mapeamento de um pedido exigiria um banco de pé,
 * e o mapeamento é justamente a parte que erra no detalhe (centavo, bigint,
 * quem entrega). A montagem real vive no factory.
 */
export interface FilaDeEventosFood99 {
  pendentes(appShopId: string): Promise<EventoPendenteFood99[]>;
  concluir(eventIds: string[]): Promise<void>;
}

/** O pedido como o 99Food o descreve. Só os campos que usamos. */
interface OrderModel99 {
  /** Long de 64 bits — string, sempre. Ver [[99food-api]]. */
  order_id?: string | number;
  /** O número do dia na loja, começando em 1. É o que se fala em voz alta. */
  order_index?: number;
  remark?: string;
  /** 1 online, 2 dinheiro, 3 pos/crédito, 4 carteira (também online). */
  pay_type?: number;
  /** 1 entrega o 99Food, 2 entrega a loja. */
  delivery_type?: number;
  /** Unix timestamp em segundos. */
  create_time?: number;
  price?: {
    real_pay_price?: number;
    customer_need_paying_money?: number;
    delivery_price?: number;
    /** Em pedido no dinheiro, o que o entregador adianta para a loja. */
    shop_paid_money?: number;
  };
  receive_address?: {
    name?: string;
    first_name?: string;
    last_name?: string;
    calling_code?: string;
    phone?: string;
    city?: string;
    poi_address?: string;
    house_number?: string;
    poi_display_name?: string;
  };
  order_items?: OrderItem99[];
}

interface OrderItem99 {
  name?: string;
  /** O custo da linha inteira, não o unitário. */
  total_price?: number;
  sku_price?: number;
  amount?: number;
  remark?: string;
  sub_item_list?: SubItem99[];
}

interface SubItem99 {
  name?: string;
  amount?: number;
  sub_item_list?: SubItem99[];
}

export class Food99OrderSource implements OrderSource {
  readonly kind = 'FOOD99' as const;

  constructor(
    private readonly opts: {
      pedidos: Food99Pedidos;
      /** O id da loja no NOSSO sistema — o mesmo do vínculo e do webhook. */
      appShopId: string;
      fila: FilaDeEventosFood99;
      logger?: Logger;
    },
  ) {}

  /**
   * Os eventos da última leitura, agrupados pelo pedido que eles descrevem.
   *
   * Agrupado, e não uma lista só, porque quem decide o que foi reconhecido é o
   * caso de uso: ele passa os pedidos que conseguiu gravar. Carimbar o evento de
   * um pedido que falhou ao salvar o apagaria da única fila que existe.
   */
  private consumidos = new Map<string, string[]>();

  /** Eventos que não viram pedido e saem da fila de todo jeito. */
  private descartados: string[] = [];

  async fetchPending(): Promise<ExternalOrder[]> {
    const eventos = await this.opts.fila.pendentes(this.opts.appShopId);
    this.consumidos = new Map();
    this.descartados = [];

    const pedidos: ExternalOrder[] = [];
    /*
     * Um pedido gera vários eventos (criado, confirmado, alterado). Buscar o
     * detalhe uma vez por evento gastaria três chamadas para gravar um pedido
     * só — e a segunda e a terceira cairiam na idempotência da importação.
     */
    const vistos = new Set<string>();

    for (const evento of eventos) {
      /*
       * Cancelamento e reembolso não trazem pedido para dentro.
       *
       * Refletir esses eventos no pedido que já está no painel depende de
       * conhecer os códigos numéricos de `status`, que a especificação deles não
       * documenta — e adivinhar aqui marcaria pedido vivo como cancelado. Então
       * o evento é reconhecido (não fica reprocessando para sempre) e registrado
       * no log, à espera de amostras reais da homologação.
       */
      if (/cancel|refund/i.test(evento.code)) {
        this.descartados.push(evento.id);
        this.opts.logger?.info(
          { code: evento.code, orderId: evento.externalOrderId },
          '99food.evento_de_estado_ignorado',
        );
        continue;
      }

      /*
       * O evento entra na conta do pedido mesmo quando o detalhe já foi buscado
       * por um irmão: os três eventos do mesmo pedido têm que sair da fila
       * juntos, senão os repetidos voltam a cada ciclo para sempre.
       */
      const doPedido = this.consumidos.get(evento.externalOrderId) ?? [];
      doPedido.push(evento.id);
      this.consumidos.set(evento.externalOrderId, doPedido);

      if (vistos.has(evento.externalOrderId)) continue;
      vistos.add(evento.externalOrderId);

      try {
        const detalhe = (await this.opts.pedidos.detalhe(evento.externalOrderId)) as OrderModel99;
        pedidos.push(mapPedido99(detalhe, evento.externalOrderId));
      } catch (cause) {
        /*
         * Falhou buscar o detalhe: o evento NÃO pode ser carimbado, senão o
         * pedido desaparece sem ninguém notar. Some do mapa e volta no próximo
         * ciclo — rede e plataforma fora do ar se resolvem sozinhas.
         */
        this.consumidos.delete(evento.externalOrderId);
        this.opts.logger?.warn(
          { orderId: evento.externalOrderId, cause: String(cause) },
          '99food.detalhe_falhou',
        );
      }
    }

    return pedidos;
  }

  /**
   * Carimba os eventos dos pedidos que o caso de uso conseguiu gravar.
   *
   * A porta fala em id de pedido; aqui o que sai da fila é evento. A tradução é
   * o ponto todo deste método: um pedido que falhou ao salvar por queda de banco
   * NÃO vem nesta lista, e os eventos dele precisam continuar pendentes — esta
   * fila é a única cópia que existe, porque a plataforma não tem endpoint para
   * relistar o que já empurrou.
   */
  async acknowledge(externalIds: string[]): Promise<void> {
    const ids = [...this.descartados];

    for (const externalId of externalIds) {
      ids.push(...(this.consumidos.get(externalId) ?? []));
      this.consumidos.delete(externalId);
    }

    this.descartados = [];
    if (ids.length === 0) return;

    await this.opts.fila.concluir(ids);
  }
}

/** `OrderModel` do 99Food → pedido do Levô. */
export function mapPedido99(pedido: OrderModel99, externalId: string): ExternalOrder {
  const endereco = pedido.receive_address ?? {};
  const preco = pedido.price ?? {};
  const fulfillment = quemEntrega(pedido.delivery_type);

  const itens = (pedido.order_items ?? []).map(mapItem99);

  return {
    externalId,
    /*
     * O número do dia, não o id.
     *
     * A homologação exige exibir os dois, e são papéis diferentes: `order_id`
     * tem 19 dígitos e serve para a API; `order_index` é "pedido 7" — o que o
     * cliente diz no telefone e o que vai no cupom.
     */
    displayId: pedido.order_index !== undefined ? String(pedido.order_index) : undefined,
    customerName: nomeDoCliente(endereco, pedido.order_index),
    customerPhone: telefone(endereco),
    address: montarEndereco(endereco),
    reference: referencia(endereco),
    /*
     * Os valores já vêm na menor unidade da moeda — "e.g. cents", diz a
     * especificação. Nada de multiplicar por 100 aqui: com itens, a entidade
     * deriva o total deles, e este número é a rede para o pedido sem itens.
     */
    amountCents: preco.customer_need_paying_money ?? preco.real_pay_price ?? 0,
    notes: observacoes(pedido),
    placedAt: pedido.create_time ? new Date(pedido.create_time * 1000) : new Date(),
    items: itens.length > 0 ? itens : undefined,
    /*
     * A taxa só faz sentido quando a entrega é nossa. Quando o 99Food entrega,
     * quem cobra e quem paga a corrida é ele — o caso de uso zera a taxa nesse
     * caso, e mandá-la de todo jeito seria confiar que ele sempre vai zerar.
     */
    deliveryFeeCents: fulfillment === 'DELIVERY' ? preco.delivery_price : undefined,
    paymentMethod: comoPagou(pedido.pay_type),
    fulfillment,
  };
}

/**
 * Quem leva o pedido embora.
 *
 * `delivery_type` é 1 quando o entregador é do 99Food e 2 quando é da loja. O
 * primeiro é o caso que não existia no Levô antes desta integração: o pedido
 * precisa aparecer na cozinha, mas nunca pode entrar na rota de um motoboy
 * nosso — ele seria mandado buscar um pacote que outro entregador já levou.
 *
 * Valor desconhecido cai em `DELIVERY`, que é o comportamento antigo: um tipo
 * novo que a gente não conhece não deveria sumir da rota em silêncio.
 */
function quemEntrega(deliveryType: number | undefined): OrderFulfillment {
  return deliveryType === 1 ? 'PLATFORM' : 'DELIVERY';
}

/** `pay_type` → forma de pagamento. Carteira é uma forma de pagar online. */
function comoPagou(payType: number | undefined): ExternalOrder['paymentMethod'] {
  switch (payType) {
    case 1:
    case 4:
      return 'ONLINE';
    case 2:
      return 'CASH';
    case 3:
      return 'CREDIT';
    default:
      return undefined;
  }
}

function mapItem99(item: OrderItem99): ExternalOrderItem {
  const quantidade = Math.max(1, Math.trunc(item.amount ?? 1));
  const linha = item.total_price ?? (item.sku_price ?? 0) * quantidade;

  return {
    name: (item.name ?? 'Item').trim(),
    /*
     * Complementos em lista, não colados no nome: a cozinha lê isto, e "sem
     * cebola" perdido dentro de um parágrafo é pedido refeito. O `remark` do
     * item entra junto — é instrução do cliente sobre aquele prato.
     */
    options: [...complementos(item.sub_item_list), ...(item.remark?.trim() ? [item.remark.trim()] : [])],
    quantity: quantidade,
    /*
     * `total_price` é o custo da LINHA, complementos incluídos. A entidade quer
     * o unitário, e é dela que sai o total da tela — por isso a divisão.
     */
    unitPriceCents: Math.round(linha / quantidade),
  };
}

/**
 * Os complementos em texto plano, aplanando os níveis.
 *
 * Um complemento do 99Food pode ter complemento dentro ("Refrigerante" →
 * "Guaraná" → "lata"). Manter a árvore aqui não ajudaria ninguém: quem monta o
 * pedido lê uma linha.
 */
function complementos(lista: SubItem99[] | undefined): string[] {
  const saida: string[] = [];

  for (const sub of lista ?? []) {
    const nome = sub.name?.trim();
    if (nome) {
      const qtd = Math.trunc(sub.amount ?? 1);
      saida.push(qtd > 1 ? `${qtd}× ${nome}` : nome);
    }
    saida.push(...complementos(sub.sub_item_list));
  }

  return saida;
}

/**
 * A observação do pedido, mais o que o balcão precisa saber sobre o dinheiro.
 *
 * `shop_paid_money` é o valor que o entregador do 99Food **adianta para a loja**
 * no pedido em dinheiro. Quem está no balcão precisa desse número na mão: sem
 * ele, a conferência do caixa no fim do dia não fecha e ninguém sabe se o
 * entregador pagou certo. A homologação também exige exibi-lo.
 */
function observacoes(pedido: OrderModel99): string | null {
  const partes: string[] = [];

  const remark = pedido.remark?.trim();
  if (remark) partes.push(remark);

  const adiantado = pedido.price?.shop_paid_money ?? 0;
  if (pedido.pay_type === 2 && adiantado > 0) {
    partes.push(`99Food: entregador adianta R$ ${reais(adiantado)}`);
  }

  return partes.length > 0 ? partes.join(' · ') : null;
}

/** Centavos → "12,00". */
function reais(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

type Endereco99 = NonNullable<OrderModel99['receive_address']>;

/**
 * O nome do cliente, com rede embaixo.
 *
 * Em pedido entregue pelo 99Food o nome às vezes vem vazio — o entregador é
 * quem fala com o cliente, não a loja. Cair num cartão sem nome deixaria o
 * painel com uma linha anônima; o número do dia é o que a loja usa para chamar.
 */
function nomeDoCliente(endereco: Endereco99, orderIndex: number | undefined): string {
  const completo = endereco.name?.trim();
  if (completo) return completo;

  const partes = [endereco.first_name, endereco.last_name]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  if (partes.length > 0) return partes.join(' ');

  return orderIndex !== undefined ? `Pedido 99Food #${orderIndex}` : 'Cliente 99Food';
}

/** Telefone com o código do país só quando ele existe. */
function telefone(endereco: Endereco99): string | null {
  const numero = endereco.phone?.trim();
  if (!numero) return null;

  const ddi = endereco.calling_code?.trim();
  return ddi && !numero.startsWith('+') && !numero.startsWith(ddi) ? `${ddi}${numero}` : numero;
}

/**
 * O endereço numa linha.
 *
 * Vazio é resposta legítima: na entrega do 99Food não há endereço para a loja
 * ver, e o caso de uso troca isso por um rótulo em vez de estourar.
 */
function montarEndereco(endereco: Endereco99): string {
  const rua = endereco.poi_address?.trim();
  const numero = endereco.house_number?.trim();
  const cidade = endereco.city?.trim();

  const logradouro = [rua, numero].filter(Boolean).join(', ');
  return [logradouro, cidade].filter(Boolean).join(' - ');
}

/**
 * A referência: o nome do ponto, quando ele diz algo além da rua.
 *
 * `poi_display_name` costuma repetir `poi_address` — e uma referência que repete
 * o endereço só ocupa a linha que o motoboy usaria para achar o portão.
 */
function referencia(endereco: Endereco99): string | null {
  const nome = endereco.poi_display_name?.trim();
  if (!nome) return null;

  const rua = endereco.poi_address?.trim();
  return rua && nome.toLowerCase() === rua.toLowerCase() ? null : nome;
}
