import type { Payment as PaymentRow } from '@/generated/prisma/client';
import { Payment, type PaymentProvider, type PaymentStatus } from '@/core';

export const PaymentMapper = {
  toDomain(row: PaymentRow): Payment {
    return Payment.restore({
      id: row.id,
      establishmentId: row.establishmentId,
      orderId: row.orderId,
      provider: row.provider as PaymentProvider,
      externalId: row.externalId,
      status: row.status as PaymentStatus,
      amountCents: row.amountCents,
      qrCode: row.qrCode,
      qrCodeBase64: row.qrCodeBase64,
      checkoutUrl: row.checkoutUrl,
      expiresAt: row.expiresAt,
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(payment: Payment) {
    return {
      id: payment.id,
      establishmentId: payment.establishmentId,
      orderId: payment.orderId,
      provider: payment.provider,
      externalId: payment.externalId,
      status: payment.status,
      amountCents: payment.amountCents,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      checkoutUrl: payment.checkoutUrl,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  },
};
