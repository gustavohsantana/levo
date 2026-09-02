import {
  Address,
  type Coordinates,
  type DeliveryFeeBand,
  type Establishment,
  taxaPorDistancia,
  NotFoundError,
  type OrderItem,
  type PaymentMethod,
  type PaymentStatus,
  type Product,
  ValidationError,
  type Clock,
  type Geocoder,
  type IdGenerator,
  Money,
  Order,
  type OrderSourceKind,
  PhoneNumber,
  type UnitOfWork,
  nomesDaSelecao,
  precoDaSelecao,
  validarSelecao,
  type OptionGroupSpec,
} from '@/core';

interface Input {
  customerName: string;
  customerPhone?: string | null;
  address: string;
  reference?: string | null;
  amountReais?: number;
  notes?: string | null;
  source?: OrderSourceKind;
  externalId?: string | null;
  /** Itens do catálogo. Quando vêm, o total sai deles. */
  items?: Array<{
    productId: string;
    quantity: number;
    /** Desconto sobre a linha, em reais. Já resolvido — a tela converte %. */
    discountReais?: number;
    /**
     * O que o cliente escolheu: ids de opção, por grupo.
     *
     * Só os IDS chegam de fora. O preço é lido do banco e somado aqui — a tela
     * não manda valor, e não adianta forjar: opção inventada é recusada, e
     * preço enviado seria ignorado.
     */
    options?: Record<string, string[]>;
  }>;
  /** Ausente usa a taxa configurada no estabelecimento. */
  deliveryFeeReais?: number | null;
  /** Retirada no balcão não entra em rota nem paga taxa. */
  fulfillment?: 'DELIVERY' | 'PICKUP';
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
  /** Cidade do endereço, quando o cliente a informou no cardápio. */
  city?: string | null;
}

export class CreateOrder {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly geocoder: Geocoder,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly establishmentId: string,
  ) {}

  async execute(input: Input): Promise<Order> {
    const address = Address.create(input.address, input.reference);

    /**
     * A geocodificação acontece **fora** da transação, de propósito: é uma
     * chamada de rede que pode levar segundos, e segurar uma transação aberta
     * esperando terceiro é como se esgota o pool de conexões no pico.
     *
     * Falhar aqui não impede o pedido de existir — ele entra sem coordenada,
     * aparece marcado na tela e o dono ajusta o pino. Perder o pedido porque o
     * geocodificador piscou seria muito pior que exibi-lo sem mapa.
     */
    /*
     * A cidade do estabelecimento entra na busca. Ler antes da transação é uma
     * ida a mais ao banco, e vale: sem ela o geocodificador procura no país
     * inteiro e devolve rua homônima de outro estado.
     */
    const estabelecimento = await this.uow.run((repos) => repos.establishments.current());

    const coordinates = await this.geocoder
      .geocode(address, {
        city: input.city?.trim() || estabelecimento.city,
        state: estabelecimento.state,
      })
      .catch(() => null);

    return this.uow.run(async (repos) => {
      const itens = await this.resolverItens(repos, input.items ?? []);
      /*
       * Retirada não paga taxa de entrega.
       *
       * Aqui, e não na tela: cobrar por uma entrega que não vai acontecer é o
       * tipo de erro que o cliente descobre no balcão, com o pedido pronto — e
       * aí a conversa é sobre devolver dinheiro, não sobre um campo do
       * formulário.
       */
      const taxa =
        input.fulfillment === 'PICKUP'
          ? Money.zero()
          : await this.taxaDeEntrega(repos, estabelecimento, coordinates, input);

      const order = Order.create({
        id: this.ids.next(),
        establishmentId: this.establishmentId,
        source: input.source ?? 'MANUAL',
        externalId: input.externalId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone
          ? PhoneNumber.tryCreate(input.customerPhone)
          : null,
        address,
        coordinates,
          fulfillment: input.fulfillment ?? 'DELIVERY',
        amount: Money.fromReais(input.amountReais ?? 0),
        deliveryFee: taxa,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus ?? null,
        items: itens,
        notes: input.notes,
        now: this.clock.now(),
      });

      if (!coordinates) order.markGeocodingFailed('endereço não localizado', this.clock.now());

      await repos.orders.save(order);
      await repos.events.append(order.pullEvents());

      return order;
    });
  }

  /**
   * Quanto cobrar de entrega.
   *
   * Ordem de preferência: o que o dono digitou, a faixa da distância, a taxa
   * fixa. O valor digitado ganha sempre — bairro complicado, cliente conhecido,
   * promoção: a regra existe para poupar digitação, não para discordar de quem
   * está atendendo.
   *
   * Sem coordenada não há distância, e aí a faixa não se aplica: um endereço
   * que o mapa não achou cobraria a faixa mais cara por acidente.
   */
  private async taxaDeEntrega(
    repos: { establishments: { deliveryFeeBands(): Promise<DeliveryFeeBand[]> } },
    estabelecimento: Establishment,
    coordinates: Coordinates | null,
    input: Input,
  ): Promise<Money> {
    if (input.deliveryFeeReais !== undefined && input.deliveryFeeReais !== null) {
      return Money.fromReais(input.deliveryFeeReais);
    }

    if (!coordinates) return estabelecimento.deliveryFee;

    const faixas = await repos.establishments.deliveryFeeBands();
    const metros = estabelecimento.coordinates.distanceTo(coordinates);

    return taxaPorDistancia(metros, faixas, estabelecimento.deliveryFee);
  }

  /**
   * Copia nome e preço do catálogo para dentro do pedido.
   *
   * A cópia é o ponto: o preço muda amanhã e o pedido de hoje precisa continuar
   * valendo o que valeu. Guardar só o `productId` faria o histórico se
   * reescrever a cada reajuste, e a conta do dia deixaria de fechar.
   */
  private async resolverItens(
    repos: {
      products: { findManyByIds(ids: string[]): Promise<Product[]> };
      optionGroups: { forProducts(ids: string[]): Promise<Map<string, OptionGroupSpec[]>> };
    },
    pedidos: Array<{
      productId: string;
      quantity: number;
      discountReais?: number;
      options?: Record<string, string[]>;
    }>,
  ): Promise<OrderItem[]> {
    if (pedidos.length === 0) return [];

    const ids = pedidos.map((i) => i.productId);
    const produtos = await repos.products.findManyByIds(ids);
    const porId = new Map(produtos.map((p) => [p.id, p]));
    const gruposPorProduto = await repos.optionGroups.forProducts(ids);

    return pedidos.map((pedido) => {
      const produto = porId.get(pedido.productId);
      if (!produto) throw new NotFoundError('Produto', pedido.productId);

      if (!Number.isInteger(pedido.quantity) || pedido.quantity < 1) {
        throw new ValidationError('Quantidade inválida', {
          productId: pedido.productId,
          quantity: pedido.quantity,
        });
      }

      const grupos = gruposPorProduto.get(produto.id) ?? [];
      const escolha = pedido.options ?? {};

      /*
       * ⭐ Validação e preço no servidor, sempre.
       *
       * A tela também valida, mas quem manda o pedido pode ser qualquer coisa
       * — outra aba, um script, um app antigo em cache. Sem esta conferência,
       * uma pizza sem sabor sai para a cozinha e uma opção inventada com preço
       * zero vira pizza de graça.
       *
       * O preço NUNCA vem de fora: chegam os ids, o valor é lido do banco.
       */
      validarSelecao(grupos, escolha);

      return {
        productId: produto.id,
        name: produto.name,
        options: nomesDaSelecao(grupos, escolha),
        unitPrice: precoDaSelecao(produto.price, grupos, escolha),
        quantity: pedido.quantity,
        discount: Money.fromReais(pedido.discountReais ?? 0),
      };
    });
  }
}
