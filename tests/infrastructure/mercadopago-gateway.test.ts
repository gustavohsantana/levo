import { afterEach, describe, expect, it, vi } from 'vitest';
import { MercadoPagoGateway } from '@/infrastructure/payments/mercadopago/gateway';

afterEach(() => vi.unstubAllGlobals());

describe('MercadoPagoGateway', () => {
  it('cria cobrança Pix e guarda id numérico extraído da ticket_url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'ORD123',
          transactions: {
            payments: [{
              id: 'PAY01ABC',
              reference_id: '000f2x4yod',
              payment_method: {
                id: 'pix',
                qr_code: '00020126pix',
                qr_code_base64: 'abc123',
                ticket_url: 'https://www.mercadopago.com.br/payments/175108590393/ticket',
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

    expect(charge.externalId).toBe('175108590393');
    expect(charge.qrCode).toBe('00020126pix');
    expect(charge.qrCodeBase64).toBe('abc123');
    expect(charge.ticketUrl).toBe(
      'https://www.mercadopago.com.br/payments/175108590393/ticket',
    );
  });

  it('busca id numérico quando Orders API só devolve PAY01', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            transactions: {
              payments: [{
                id: 'PAY01ABC',
                payment_method: { qr_code: '00020126pix' },
              }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [{ id: 999888777 }] }),
        }),
    );

    const gateway = new MercadoPagoGateway();
    const charge = await gateway.createPixCharge({
      accessToken: 'token-loja',
      orderId: 'pedido-2',
      amountCents: 100,
      expiresInMinutes: 30,
    });

    expect(charge.externalId).toBe('999888777');
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
    const charge = await gateway.getCharge({ accessToken: 'token', externalId: '175108590393' });

    expect(charge.status).toBe('PAID');
    expect(charge.amountCents).toBe(7890);
    expect(charge.paidAt?.toISOString()).toBe('2026-08-28T12:00:00.000Z');
    expect(charge.resolvedExternalId).toBe('175108590393');
  });

  it('resolve reference_id curto via external_reference na consulta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [{ id: 176063985562 }] }),
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
      externalId: '000f2x4yod',
      orderId: 'pedido-antigo',
    });

    expect(charge.status).toBe('PAID');
    expect(charge.amountCents).toBe(101);
    expect(charge.resolvedExternalId).toBe('176063985562');
  });
});
