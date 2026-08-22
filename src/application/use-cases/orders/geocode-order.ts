import { NotFoundError, type Clock, type Geocoder, type UnitOfWork } from '@/core';
import { Coordinates } from '@/core';

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

  async execute(orderId: string, manual?: { lat: number; lng: number }): Promise<boolean> {
    const order = await this.uow.run((repos) => repos.orders.findById(orderId));
    if (!order) throw new NotFoundError('Pedido', orderId);

    const coordinates = manual
      ? Coordinates.create(manual.lat, manual.lng)
      : await this.geocoder.geocode(order.address).catch(() => null);

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
