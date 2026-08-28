import { afterEach, describe, expect, it, vi } from 'vitest';
import { MercadoPagoGateway } from '@/infrastructure/payments/mercadopago/gateway';

afterEach(() => vi.unstubAllGlobals());

describe('MercadoPagoGateway', () => {
  it('cria cobrança Pix e extrai QR Code da resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'ORD123',
          transactions: {
            payments: [{
              id: 'PAY456',
              payment_method: {
                id: 'pix',
                qr_code: '00020126pix',
                qr_code_base64: 'abc123',
              },
            }],
          },
        }),
      }),
    );

    const gateway = new MercadoPagoGateway();
    const charge = await gateway.createPixCharge({
      accessToken: 'token-loja',
      orderId: 'pedido-1',
      amountCents: 7890,
      payerEmail: 'cliente@teste.com',
      expiresInMinutes: 30,
    });

    expect(charge.externalId).toBe('PAY456');
    expect(charge.qrCode).toBe('00020126pix');
    expect(charge.qrCodeBase64).toBe('abc123');
    expect(charge.ticketUrl).toBeNull();

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer token-loja',
      'X-Idempotency-Key': 'pedido-1',
    });
  });

  it('consulta pagamento aprovado na API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'approved',
          transaction_amount: 78.9,
          date_approved: '2026-08-28T12:00:00.000Z',
        }),
      }),
    );

    const gateway = new MercadoPagoGateway();
    const charge = await gateway.getCharge({ accessToken: 'token', externalId: 'PAY456' });

    expect(charge.status).toBe('PAID');
    expect(charge.amountCents).toBe(7890);
    expect(charge.paidAt?.toISOString()).toBe('2026-08-28T12:00:00.000Z');
  });
});
