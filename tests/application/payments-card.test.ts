import { describe, expect, it } from 'vitest';
import { CreatePayment } from '@/application/use-cases/payments/create-payment';
import { ConfirmPayment } from '@/application/use-cases/payments/confirm-payment';
import { Address, Money, Order, PaymentStatus, type PaymentGateway } from '@/core';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { mapMercadoPagoStatus } from '@/infrastructure/payments/mercadopago/gateway';
import { PIZZARIA } from '../helpers/fixtures';

function pedidoPendente(id = 'pedido-1') {
  return Order.create({
    id,
    establishmentId: PIZZARIA.id,
    source: 'SITE',
    customerName: 'Maria',
    address: Address.create('Rua das Flores, 10 - Centro, Curitiba'),
    amount: Money.fromCents(4500),
    paymentStatus: 'PENDING',
  });
}

function gatewayFake(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    async createPixCharge() {
      throw new Error('não deveria criar Pix neste teste');
    },
    async createCardCheckout() {
      throw new Error('não deveria criar cartão neste teste');
    },
    async createCardCharge() {
      throw new Error('não deveria cobrar cartão transparente neste teste');
    },
    async getCharge() {
      throw new Error('não deveria consultar neste teste');
    },
    ...overrides,
  };
}

describe('mapMercadoPagoStatus', () => {
  it('traduz os desfechos de cartão', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('PAID');
    expect(mapMercadoPagoStatus('rejected')).toBe('REJECTED');
    expect(mapMercadoPagoStatus('in_process')).toBe('IN_REVIEW');
    expect(mapMercadoPagoStatus('charged_back')).toBe('CHARGED_BACK');
    expect(mapMercadoPagoStatus('refunded')).toBe('REFUNDED');
    expect(mapMercadoPagoStatus('pending')).toBe('PENDING');
  });
});

describe('CreatePayment cartão', () => {
  it('guarda a preferência e devolve o link do Checkout Pro', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    db.orders.set('pedido-1', pedidoPendente());
    const uow = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-08-28T18:00:00Z'));

    const useCase = new CreatePayment(
      uow,
      gatewayFake({
        async createCardCheckout(input) {
          expect(input.orderId).toBe('pedido-1');
          expect(input.amountCents).toBe(4500);
          expect(input.backUrl).toContain('/pagamento');
          return {
            externalId: 'pref-abc',
            checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-abc',
            expiresAt: new Date('2026-08-28T19:00:00Z'),
          };
        },
      }),
      new SequentialIds('pay'),
      clock,
      PIZZARIA.id,
      async () => 'token-loja',
    );

    const payment = await useCase.execute({
      orderId: 'pedido-1',
      method: 'card',
      backUrl: 'https://levoentregas.vercel.app/cardapio/pizzaria/pagamento?pedido=pedido-1',
      description: 'Pedido em Pizzaria do Zé',
    });

    expect(payment.externalId).toBe('pref-abc');
    expect(payment.checkoutUrl).toContain('pref_id=pref-abc');
    expect(payment.qrCode).toBeNull();
    expect(db.payments.get('pay-1')?.checkoutUrl).toContain('mercadopago');
  });

  it('cobra com o token do Brick usando o valor do pedido, não o que o navegador mandou', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    db.orders.set('pedido-1', pedidoPendente());
    const uow = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-08-28T18:00:00Z'));
    let amountEnviado = 0;

    const useCase = new CreatePayment(
      uow,
      gatewayFake({
        async createCardCharge(input) {
          amountEnviado = input.amountCents;
          expect(input.token).toBe('tok_brick');
          expect(input.orderId).toBe('pedido-1');
          return { externalId: '176099999001', status: PaymentStatus.Paid, paidAt: clock.now() };
        },
      }),
      new SequentialIds('pay'),
      clock,
      PIZZARIA.id,
      async () => 'token-loja',
    );

    const payment = await useCase.execute({
      orderId: 'pedido-1',
      method: 'card',
      card: { token: 'tok_brick', installments: 1, paymentMethodId: 'master' },
    });

    expect(amountEnviado).toBe(4500);
    expect(payment.externalId).toBe('176099999001');
    expect(payment.checkoutUrl).toBeNull();
    expect(payment.status).toBe('PAID');
    expect(db.orders.get('pedido-1')?.paymentStatus).toBe('PAID');
  });
});

describe('ConfirmPayment cartão', () => {
  it('recusa o pedido quando o emissor recusa o cartão', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    const pedido = pedidoPendente();
    db.orders.set(pedido.id, pedido);

    const criado = await new CreatePayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async createCardCheckout() {
          return {
            externalId: 'pref-abc',
            checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-abc',
            expiresAt: new Date('2026-08-28T19:00:00Z'),
          };
        },
      }),
      new SequentialIds('pay'),
      new FixedClock(new Date('2026-08-28T18:00:00Z')),
      PIZZARIA.id,
      async () => 'token-loja',
    ).execute({ orderId: pedido.id, method: 'card' });

    const confirm = new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Rejected,
            paidAt: null,
            amountCents: 4500,
            resolvedExternalId: '176099999999',
          };
        },
      }),
      new FixedClock(new Date('2026-08-28T18:01:00Z')),
      PIZZARIA.id,
      async () => 'token-loja',
    );

    await expect(confirm.execute({ externalId: criado.externalId })).resolves.toBe('REJECTED');
    expect(db.orders.get(pedido.id)?.paymentStatus).toBe('REJECTED');
    expect(db.orders.get(pedido.id)?.isReleasedToKitchen).toBe(false);
  });

  it('marca chargeback depois de já ter sido pago', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    const pedido = pedidoPendente();
    db.orders.set(pedido.id, pedido);

    await new CreatePayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async createCardCheckout() {
          return {
            externalId: 'pref-abc',
            checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-abc',
            expiresAt: new Date('2026-08-28T19:00:00Z'),
          };
        },
      }),
      new SequentialIds('pay'),
      new FixedClock(new Date('2026-08-28T18:00:00Z')),
      PIZZARIA.id,
      async () => 'token-loja',
    ).execute({ orderId: pedido.id, method: 'card' });

    const uow = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-08-28T18:02:00Z'));
    const confirm = new ConfirmPayment(
      uow,
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Paid,
            paidAt: clock.now(),
            amountCents: 4500,
            resolvedExternalId: '176099999999',
          };
        },
      }),
      clock,
      PIZZARIA.id,
      async () => 'token-loja',
    );

    await expect(confirm.execute({ externalId: 'pref-abc' })).resolves.toBe('PAID');
    expect(db.orders.get(pedido.id)?.isReleasedToKitchen).toBe(true);

    const depois = new ConfirmPayment(
      uow,
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.ChargedBack,
            paidAt: clock.now(),
            amountCents: 4500,
            resolvedExternalId: '176099999999',
          };
        },
      }),
      clock,
      PIZZARIA.id,
      async () => 'token-loja',
    );

    await expect(depois.execute({ externalId: '176099999999' })).resolves.toBe('CHARGED_BACK');
    expect(db.orders.get(pedido.id)?.paymentStatus).toBe('CHARGED_BACK');
    expect(db.eventsNamed('order.payment_charged_back')).toHaveLength(1);
  });

  it('não coloca pedido recusado na fila da cozinha', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    const pedido = pedidoPendente('pedido-recusado');
    pedido.markPaymentStatus('REJECTED');
    db.orders.set(pedido.id, pedido);

    const uow = new InMemoryUnitOfWork(db);
    const fila = await uow.run((repos) => repos.orders.listPending());
    expect(fila.map((o) => o.id)).not.toContain('pedido-recusado');
  });
});
