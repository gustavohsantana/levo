import { afterEach, describe, expect, it, vi } from 'vitest';
import { MercadoPagoGateway } from '@/infrastructure/payments/mercadopago/gateway';

afterEach(() => vi.unstubAllGlobals());

describe('MercadoPagoGateway', () => {
  it('cria cobrança Pix na Payments API e guarda o id numérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 176067700360,
          status: 'pending',
          point_of_interaction: {
            transaction_data: {
              qr_code: '00020126pix',
              qr_code_base64: 'abc123',
              ticket_url: 'https://www.mercadopago.com.br/payments/176067700360/ticket',
            },
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

    expect(charge.externalId).toBe('176067700360');
    expect(charge.qrCode).toBe('00020126pix');
    expect(charge.qrCodeBase64).toBe('abc123');

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/payments');
    const body = JSON.parse(String(init?.body));
    expect(body.payment_method_id).toBe('pix');
    expect(body.transaction_amount).toBe(78.9);
    expect(body.external_reference).toBe('pedido-1');
    if (body.notification_url) {
      expect(body.notification_url).toContain('/api/webhooks/payments/mercadopago');
    }
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
    const charge = await gateway.getCharge({ accessToken: 'token', externalId: '176067700360' });

    expect(charge.status).toBe('PAID');
    expect(charge.amountCents).toBe(7890);
    expect(charge.resolvedExternalId).toBe('176067700360');
  });

  it('resolve id ORD01 do webhook via ticket_url da order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            external_reference: 'pedido-antigo',
            transactions: {
              payments: [{
                payment_method: {
                  ticket_url: 'https://www.mercadopago.com.br/payments/176067700360/ticket',
                },
              }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'approved',
            transaction_amount: 1.01,
            date_approved: '2026-08-28T13:00:00.000Z',
          }),
        }),
    );

    const gateway = new MercadoPagoGateway();
    const charge = await gateway.getCharge({
      accessToken: 'token',
      externalId: 'ORD01M14QZA3T9VV7ZPZ230GV2JQY',
    });

    expect(charge.status).toBe('PAID');
    expect(charge.amountCents).toBe(101);
    expect(charge.resolvedExternalId).toBe('176067700360');
  });
});
