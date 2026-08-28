import type { Courier as CourierRow, Establishment as EstablishmentRow } from '@/generated/prisma/client';
import { Address, Coordinates, Courier, Establishment, Money, PhoneNumber } from '@/core';

export * from './order-mapper';
export * from './payment-mapper';
export * from './route-mapper';

export const CourierMapper = {
  toDomain(row: CourierRow): Courier {
    return new Courier(
      row.id,
      row.establishmentId,
      row.name,
      PhoneNumber.create(row.phone),
      row.active,
    );
  },

  toPersistence(courier: Courier) {
    return {
      id: courier.id,
      establishmentId: courier.establishmentId,
      name: courier.name,
      phone: courier.phone.value,
      active: courier.active,
    };
  },
};

export const EstablishmentMapper = {
  toDomain(row: EstablishmentRow): Establishment {
    return new Establishment(
      row.id,
      row.name,
      Address.create(row.address),
      Coordinates.create(row.lat, row.lng),
      row.city,
      row.state,
      Money.fromCents(row.deliveryFeeCents),
      row.slug,
    );
  },
};
