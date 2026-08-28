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

  it('cria preferência de cartão no Checkout Pro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'pref-123',
          init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123',
        }),
      }),
    );

    const gateway = new MercadoPagoGateway();
    const charge = await gateway.createCardCheckout({
      accessToken: 'token-loja',
      orderId: 'pedido-card',
      amountCents: 4500,
      description: 'Pedido em Pizzaria do Zé',
      payerEmail: 'cliente@teste.com',
      statementDescriptor: 'Pizzaria do Ze',
      backUrl: 'https://levoentregas.vercel.app/cardapio/pizzaria/pagamento?pedido=pedido-card',
      expiresInMinutes: 60,
    });

    expect(charge.externalId).toBe('pref-123');
    expect(charge.checkoutUrl).toContain('pref_id=pref-123');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.binary_mode).toBe(true);
    expect(body.external_reference).toBe('pedido-card');
    expect(body.payment_methods.excluded_payment_types).toEqual(
      expect.arrayContaining([{ id: 'bank_transfer' }]),
    );
    expect(body.back_urls.success).toContain('/pagamento');
    expect(body.auto_return).toBe('approved');
  });

  it('cobra cartão na Payments API com o token do Brick, nunca com o número do cartão', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 176099999001,
          status: 'approved',
          date_approved: '2026-08-28T18:01:00.000-03:00',
          transaction_amount: 45,
        }),
      }),
    );

    const gateway = new MercadoPagoGateway();
    const charge = await gateway.createCardCharge({
      accessToken: 'token-loja',
      orderId: 'pedido-card',
      amountCents: 4500,
      token: 'tok_abc123xyz',
      installments: 1,
      paymentMethodId: 'master',
      issuerId: '24',
      payerEmail: 'cliente@teste.com',
      identification: { type: 'CPF', number: '12345678909' },
    });

    expect(charge.externalId).toBe('176099999001');
    expect(charge.status).toBe('PAID');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.token).toBe('tok_abc123xyz');
    expect(body.transaction_amount).toBe(45);
    expect(body.external_reference).toBe('pedido-card');
    expect(body.binary_mode).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/5031|card_number|cvv/i);
    expect(body.notification_url).toBeUndefined();
  });

  it('só manda webhook quando a URL pública é https', async () => {
    const anterior = process.env.PUBLIC_BASE_URL;
    process.env.PUBLIC_BASE_URL = 'https://levoentregas.vercel.app';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 176099999002, status: 'approved', transaction_amount: 10 }),
      }),
    );

    try {
      await new MercadoPagoGateway().createCardCharge({
        accessToken: 'token-loja',
        orderId: 'pedido-https',
        amountCents: 1000,
        token: 'tok_https',
        installments: 1,
        paymentMethodId: 'visa',
      });
    } finally {
      if (anterior === undefined) delete process.env.PUBLIC_BASE_URL;
      else process.env.PUBLIC_BASE_URL = anterior;
    }

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.notification_url).toBe(
      'https://levoentregas.vercel.app/api/webhooks/payments/mercadopago',
    );
  });

  it('cartão recusado vira REJECTED; preferência ainda sem pagamento fica PENDING', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'rejected', status_detail: 'cc_rejected_other_reason', transaction_amount: 45 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({}),
        }),
    );

    const gateway = new MercadoPagoGateway();
    const recusado = await gateway.getCharge({ accessToken: 'token', externalId: '176067700360' });
    expect(recusado.status).toBe('REJECTED');

    const pendente = await gateway.getCharge({
      accessToken: 'token',
      externalId: 'pref-ainda-sem-pagamento',
    });
    expect(pendente.status).toBe('PENDING');
    expect(pendente.amountCents).toBe(0);
  });
});
