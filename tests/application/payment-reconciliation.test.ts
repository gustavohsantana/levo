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
import { PIZZARIA } from '../helpers/fixtures';

/**
 * Reconciliação de pagamentos pendentes.
 *
 * O webhook do gateway é otimização, não garantia: cobrança de Pix que expira
 * sem ser paga não gera notificação confiável. Sem varrer os pendentes, o
 * pagamento fica PENDING para sempre e o pedido trava em "aguardando pagamento"
 * na tela do cliente — e com Pix isso é a maioria, porque carrinho abandonado é
 * a regra.
 */
function pedidoPendente(id = 'pedido-1') {
  return Order.create({
    id,
    establishmentId: PIZZARIA.id,
    source: 'SITE',
    customerName: 'Maria',
    address: Address.create('Rua das Flores, 10 - Centro, Pouso Alegre'),
    amount: Money.fromCents(4500),
    paymentStatus: 'PENDING',
  });
}

function gatewayFake(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    async createPixCharge() {
      throw new Error('não usado');
    },
    async cancelPixCharge() {},
    async createCardCheckout() {
      throw new Error('não usado');
    },
    async createCardCharge() {
      throw new Error('não usado');
    },
    async getCharge() {
      throw new Error('não usado');
    },
    async refund() {
      throw new Error('não usado');
    },
    ...overrides,
  };
}

async function comPixPendente() {
  const db = new InMemoryDatabase(PIZZARIA);
  const pedido = pedidoPendente();
  db.orders.set(pedido.id, pedido);

  const criado = await new CreatePayment(
    new InMemoryUnitOfWork(db),
    gatewayFake({
      async createPixCharge() {
        return {
          externalId: '176108208484',
          qrCode: '000201265800…',
          qrCodeBase64: null,
          ticketUrl: null,
          expiresAt: new Date('2026-08-28T18:30:00Z'),
        };
      },
    }),
    new SequentialIds('pay'),
    new FixedClock(new Date('2026-08-28T18:00:00Z')),
    PIZZARIA.id,
    async () => 'token-loja',
  ).execute({ orderId: pedido.id, method: 'pix' });

  return { db, pedido, criado };
}

describe('varredura de pagamentos pendentes', () => {
  it('lista os pendentes mais antigos que o corte', async () => {
    const { db } = await comPixPendente();
    const uow = new InMemoryUnitOfWork(db);

    // Cinco minutos depois: já passou da janela em que o webhook resolveria.
    const pendentes = await uow.run((repos) =>
      repos.payments.listPendingOlderThan(new Date('2026-08-28T18:05:00Z'), 20),
    );

    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].externalId).toBe('176108208484');
  });

  it('não pega pagamento recente demais', async () => {
    /*
     * O worker corta em `agora − 2 min`. Trinta segundos depois de criada, a
     * cobrança fica de fora — conversar com o gateway sobre algo que o cliente
     * ainda está lendo no aplicativo do banco é chamada desperdiçada, e o
     * webhook resolve o caso comum em segundos.
     */
    const { db } = await comPixPendente();
    const uow = new InMemoryUnitOfWork(db);

    const agora = new Date('2026-08-28T18:00:30Z');
    const corte = new Date(agora.getTime() - 2 * 60_000);

    const pendentes = await uow.run((repos) =>
      repos.payments.listPendingOlderThan(corte, 20),
    );

    expect(pendentes).toEqual([]);
  });

  it('respeita o teto por rodada', async () => {
    // Fila grande se resolve em ciclos, não numa avalanche de chamadas ao
    // gateway.
    const { db } = await comPixPendente();
    const uow = new InMemoryUnitOfWork(db);

    const pendentes = await uow.run((repos) =>
      repos.payments.listPendingOlderThan(new Date('2026-08-28T18:05:00Z'), 1),
    );

    expect(pendentes).toHaveLength(1);
  });

  it('marca como expirado o Pix que venceu sem pagamento', async () => {
    // É o caso que motivou tudo: o Mercado Pago cancela por expiração e não
    // avisa, e sem isto o pedido fica preso para sempre.
    const { db, pedido, criado } = await comPixPendente();

    const confirm = new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Expired,
            paidAt: null,
            amountCents: 4500,
            resolvedExternalId: '176108208484',
          };
        },
      }),
      new FixedClock(new Date('2026-08-28T18:10:00Z')),
      PIZZARIA.id,
      async () => 'token-loja',
    );

    await expect(confirm.execute({ externalId: criado.externalId })).resolves.toBe('EXPIRED');
    expect(db.payments.get([...db.payments.keys()][0])?.status).not.toBe('PENDING');
    expect(db.orders.get(pedido.id)?.isReleasedToKitchen).toBe(false);
  });

  it('confirma o Pix pago que o webhook não trouxe', async () => {
    const { db, pedido, criado } = await comPixPendente();

    const confirm = new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Paid,
            paidAt: new Date('2026-08-28T18:03:00Z'),
            amountCents: 4500,
            resolvedExternalId: '176108208484',
          };
        },
      }),
      new FixedClock(new Date('2026-08-28T18:05:00Z')),
      PIZZARIA.id,
      async () => 'token-loja',
    );

    await expect(confirm.execute({ externalId: criado.externalId })).resolves.toBe('PAID');
    expect(db.orders.get(pedido.id)?.paymentStatus).toBe('PAID');
  });

  it('para de listar o que já saiu de pendente', async () => {
    const { db, criado } = await comPixPendente();

    await new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Paid,
            paidAt: new Date('2026-08-28T18:03:00Z'),
            amountCents: 4500,
            resolvedExternalId: '176108208484',
          };
        },
      }),
      new FixedClock(new Date('2026-08-28T18:05:00Z')),
      PIZZARIA.id,
      async () => 'token-loja',
    ).execute({ externalId: criado.externalId });

    const uow = new InMemoryUnitOfWork(db);
    const pendentes = await uow.run((repos) =>
      repos.payments.listPendingOlderThan(new Date('2026-08-28T18:10:00Z'), 20),
    );

    expect(pendentes).toEqual([]);
  });
});
