import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyMercadoPagoWebhookSignature } from '@/infrastructure/payments/mercadopago/webhook-signature';

describe('verifyMercadoPagoWebhookSignature', () => {
  it('aceita assinatura válida', () => {
    const secret = 'segredo-do-webhook';
    const dataId = '123456';
    const requestId = 'req-abc';
    const ts = '1704908010';
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

    expect(() =>
      verifyMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).not.toThrow();
  });

  it('recusa assinatura errada', () => {
    expect(() =>
      verifyMercadoPagoWebhookSignature({
        xSignature: 'ts=1,v1=deadbeef',
        xRequestId: 'req',
        dataId: '1',
        secret: 'segredo',
      }),
    ).toThrow(/Assinatura inválida/);
  });
});
