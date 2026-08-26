import {
  Address,
  Coordinates,
  NotFoundError,
  type Clock,
  type Geocoder,
  type UnitOfWork,
} from '@/core';

/**
 * Segunda chance para um pedido que entrou sem coordenada: ou o dono corrigiu
 * o endereço, ou arrastou o pino no mapa na mão.
 */
export class GeocodeOrder {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly geocoder: Geocoder,
    private readonly clock: Clock,
  ) {}

  async execute(
    orderId: string,
    manual?: { lat: number; lng: number },
    novoEndereco?: string,
  ): Promise<boolean> {
    const order = await this.uow.run((repos) => repos.orders.findById(orderId));
    if (!order) throw new NotFoundError('Pedido', orderId);

    /*
     * Endereço corrigido é gravado mesmo que o mapa continue não achando: o
     * texto certo vai para o link de rastreio do cliente e para a tela do
     * motoboy, e serve mesmo sem coordenada.
     */
    if (novoEndereco?.trim()) {
      const endereco = Address.create(novoEndereco, order.address.reference);
      order.changeAddress(endereco, this.clock.now());

      await this.uow.run(async (repos) => {
        await repos.orders.save(order);
        await repos.events.append(order.pullEvents());
      });
    }

    const coordinates = manual
      ? Coordinates.create(manual.lat, manual.lng)
      : await (async () => {
          const estabelecimento = await this.uow.run((repos) =>
            repos.establishments.current(),
          );
          return this.geocoder
            .geocode(order.address, {
              city: estabelecimento.city,
              state: estabelecimento.state,
            })
            .catch(() => null);
        })();

    if (!coordinates) {
      return this.uow.run(async (repos) => {
        order.markGeocodingFailed('endereço não localizado', this.clock.now());
        await repos.events.append(order.pullEvents());
        return false;
      });
    }

    return this.uow.run(async (repos) => {
      order.locateAt(coordinates, this.clock.now());
      await repos.orders.save(order);
      await repos.events.append(order.pullEvents());
      return true;
    });
  }
}
