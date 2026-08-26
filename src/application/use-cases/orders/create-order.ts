import {
  Address,
  NotFoundError,
  type OrderItem,
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
  items?: Array<{ productId: string; quantity: number }>;
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
    const coordinates = await this.geocoder.geocode(address).catch(() => null);

    return this.uow.run(async (repos) => {
      const itens = await this.resolverItens(repos, input.items ?? []);

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
        amount: Money.fromReais(input.amountReais ?? 0),
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
   * Copia nome e preço do catálogo para dentro do pedido.
   *
   * A cópia é o ponto: o preço muda amanhã e o pedido de hoje precisa continuar
   * valendo o que valeu. Guardar só o `productId` faria o histórico se
   * reescrever a cada reajuste, e a conta do dia deixaria de fechar.
   */
  private async resolverItens(
    repos: { products: { findManyByIds(ids: string[]): Promise<Product[]> } },
    pedidos: Array<{ productId: string; quantity: number }>,
  ): Promise<OrderItem[]> {
    if (pedidos.length === 0) return [];

    const produtos = await repos.products.findManyByIds(pedidos.map((i) => i.productId));
    const porId = new Map(produtos.map((p) => [p.id, p]));

    return pedidos.map((pedido) => {
      const produto = porId.get(pedido.productId);
      if (!produto) throw new NotFoundError('Produto', pedido.productId);

      if (!Number.isInteger(pedido.quantity) || pedido.quantity < 1) {
        throw new ValidationError('Quantidade inválida', {
          productId: pedido.productId,
          quantity: pedido.quantity,
        });
      }

      return {
        productId: produto.id,
        name: produto.name,
        unitPrice: produto.price,
        quantity: pedido.quantity,
      };
    });
  }
}
