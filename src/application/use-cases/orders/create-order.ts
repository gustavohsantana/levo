import {
  Address,
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
        notes: input.notes,
        now: this.clock.now(),
      });

      if (!coordinates) order.markGeocodingFailed('endereço não localizado', this.clock.now());

      await repos.orders.save(order);
      await repos.events.append(order.pullEvents());

      return order;
    });
  }
}
