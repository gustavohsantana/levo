import type { Order as OrderRow, OrderItem as OrderItemRow } from '@/generated/prisma/client';
import {
  Address,
  Coordinates,
  Money,
  Order,
  type OrderSourceKind,
  type OrderStatus,
  type PaymentStatus,
  PhoneNumber,
  Token,
} from '@/core';

/**
 * Tradução entre a linha do banco e a entidade.
 *
 * É o preço de manter o domínio livre do Prisma — e o que permite que todo o
 * teste de regra de negócio rode em memória, em milissegundos. Concentrado num
 * arquivo por agregado, nunca espalhado pelos casos de uso.
 */
export const OrderMapper = {
  /**
   * `items` chega separado porque nem toda consulta os carrega. Quem quer
   * os itens pede o `include` e passa aqui.
   */
  toDomain(row: OrderRow & { items?: OrderItemRow[] }): Order {
    return Order.restore({
      id: row.id,
      establishmentId: row.establishmentId,
      source: row.source as OrderSourceKind,
      externalId: row.externalId,
      displayId: row.displayId,
      customerName: row.customerName,
      customerPhone: row.customerPhone ? PhoneNumber.create(row.customerPhone) : null,
      address: Address.create(row.address, row.reference),
      coordinates: row.lat !== null && row.lng !== null ? Coordinates.create(row.lat, row.lng) : null,
      amount: Money.fromCents(row.amountCents),
      deliveryFee: Money.fromCents(row.deliveryFeeCents),
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus as PaymentStatus | null,
      items: (row.items ?? []).map((item) => ({
        productId: item.productId,
        name: item.name,
        options: item.options,
        unitPrice: Money.fromCents(item.unitPriceCents),
        quantity: item.quantity,
        discount: Money.fromCents(item.discountCents),
      })),
      notes: row.notes,
      status: row.status as OrderStatus,
      trackingToken: Token.create(row.trackingToken),
      deliveryCode: row.deliveryCode,
      fulfillment: row.fulfillment,
      routeId: row.routeId,
      confirmedAt: row.confirmedAt,
      readyAt: row.readyAt,
      createdAt: row.createdAt,
      deliveredAt: row.deliveredAt,
    });
  },

  toPersistence(order: Order) {
    return {
      id: order.id,
      establishmentId: order.establishmentId,
      source: order.source,
      externalId: order.externalId,
      displayId: order.displayId,
      customerName: order.customerName,
      customerPhone: order.customerPhone?.value ?? null,
      address: order.address.raw,
      reference: order.address.reference,
      lat: order.coordinates?.lat ?? null,
      lng: order.coordinates?.lng ?? null,
      amountCents: order.amount.cents,
      deliveryFeeCents: order.deliveryFee.cents,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
      status: order.status,
      trackingToken: order.trackingToken.value,
      deliveryCode: order.deliveryCode,
      fulfillment: order.fulfillment,
      routeId: order.routeId,
      confirmedAt: order.confirmedAt,
      readyAt: order.readyAt,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
    };
  },
};
