import { describe, expect, it } from 'vitest';
import { CreatePayment } from '@/application/use-cases/payments/create-payment';
import { Address, Money, Order, type PaymentGateway } from '@/core';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { PIZZARIA } from '../helpers/fixtures';

/**
 * Renovação do código Pix vencido.
 *
 * Um QR vencido continua legível pelo banco: o cliente paga, o Mercado Pago vê
 * a cobrança expirada e devolve o dinheiro uns dois minutos depois. Nenhum
 * pagamento chega a existir, então nem webhook vem — do lado do lojista parece
 * que "o Pix nunca funciona".
 *
 * Foi o que aconteceu em produção: toda cobrança gerada pelo fluxo de pedido
 * morreu expirada, porque a chave de idempotência era o próprio pedido e o
 * Mercado Pago devolvia para sempre a primeira cobrança.
 */
const AGORA = new Date('2026-09-01T12:00:00Z');

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
    ...overrides,
  };
}

function cobranca(externalId: string, qrCode: string, expiraEm: Date) {
  return {
    externalId,
    qrCode,
    qrCodeBase64: null,
    ticketUrl: null,
    expiresAt: expiraEm,
  };
}

/** Cria o pagamento inicial e devolve tudo que o próximo passo precisa. */
async function comPixCriadoEm(momento: Date, validadeMinutos = 30) {
  const db = new InMemoryDatabase(PIZZARIA);
  db.orders.set('pedido-1', pedidoPendente());

  const criar = (gateway: PaymentGateway, clock: FixedClock) =>
    new CreatePayment(
      new InMemoryUnitOfWork(db),
      gateway,
      new SequentialIds(),
      clock,
      PIZZARIA.id,
      async () => 'token-da-loja',
    );

  const primeiro = await criar(
    gatewayFake({
      async createPixCharge() {
        return cobranca(
          '111111111111',
          'codigo-velho',
          new Date(momento.getTime() + validadeMinutos * 60_000),
        );
      },
    }),
    new FixedClock(momento),
  ).execute({ orderId: 'pedido-1' });

  return { db, criar, primeiro };
}

describe('código Pix vencido', () => {
  it('emite um código novo em vez de devolver o vencido', async () => {
    const { db, criar } = await comPixCriadoEm(new Date(AGORA.getTime() - 60 * 60_000));

    const segundo = await criar(
      gatewayFake({
        async createPixCharge() {
          return cobranca('222222222222', 'codigo-novo', new Date(AGORA.getTime() + 30 * 60_000));
        },
      }),
      new FixedClock(AGORA),
    ).execute({ orderId: 'pedido-1' });

    expect(segundo.qrCode).toBe('codigo-novo');
    expect(segundo.externalId).toBe('222222222222');
    expect(segundo.expiresAt?.getTime()).toBe(AGORA.getTime() + 30 * 60_000);
    // Mesmo registro: orderId é único em Payment.
    expect(db.payments.size).toBe(1);
  });

  it('mata a cobrança anterior antes de emitir a próxima', async () => {
    const { criar } = await comPixCriadoEm(new Date(AGORA.getTime() - 60 * 60_000));
    const cancelados: string[] = [];

    await criar(
      gatewayFake({
        async cancelPixCharge({ externalId }) {
          cancelados.push(externalId);
        },
        async createPixCharge() {
          return cobranca('222222222222', 'codigo-novo', new Date(AGORA.getTime() + 30 * 60_000));
        },
      }),
      new FixedClock(AGORA),
    ).execute({ orderId: 'pedido-1' });

    // Duas cobranças vivas deixariam o cliente pagar a que o pedido não segue.
    expect(cancelados).toEqual(['111111111111']);
  });

  it('renova quando falta menos que a margem de leitura', async () => {
    // Código criado há 29 minutos: vale por mais um, e o cliente leva mais que
    // isso entre ler o QR e confirmar no banco.
    const { criar } = await comPixCriadoEm(new Date(AGORA.getTime() - 29 * 60_000));

    const segundo = await criar(
      gatewayFake({
        async createPixCharge() {
          return cobranca('222222222222', 'codigo-novo', new Date(AGORA.getTime() + 30 * 60_000));
        },
      }),
      new FixedClock(AGORA),
    ).execute({ orderId: 'pedido-1' });

    expect(segundo.qrCode).toBe('codigo-novo');
  });

  it('reaproveita o código que ainda tem vida', async () => {
    const { criar } = await comPixCriadoEm(new Date(AGORA.getTime() - 5 * 60_000));

    const segundo = await criar(
      gatewayFake({
        async createPixCharge() {
          throw new Error('não deveria gerar cobrança nova');
        },
      }),
      new FixedClock(AGORA),
    ).execute({ orderId: 'pedido-1' });

    expect(segundo.qrCode).toBe('codigo-velho');
    expect(segundo.externalId).toBe('111111111111');
  });

  it('não troca o código de um pagamento já aprovado', async () => {
    const { db, criar } = await comPixCriadoEm(new Date(AGORA.getTime() - 60 * 60_000));

    const pago = [...db.payments.values()][0];
    pago.markPaid(new Date(AGORA.getTime() - 50 * 60_000));

    const segundo = await criar(
      gatewayFake({
        async createPixCharge() {
          throw new Error('não deveria gerar cobrança para pedido pago');
        },
      }),
      new FixedClock(AGORA),
    ).execute({ orderId: 'pedido-1' });

    expect(segundo.status).toBe('PAID');
    expect(segundo.qrCode).toBe('codigo-velho');
  });

  it('duas renovações seguidas do mesmo código usam a mesma chave', async () => {
    const { criar } = await comPixCriadoEm(new Date(AGORA.getTime() - 60 * 60_000));
    const chaves: (string | undefined)[] = [];

    const gateway = gatewayFake({
      async createPixCharge({ idempotencyKey }) {
        chaves.push(idempotencyKey);
        return cobranca('222222222222', 'codigo-novo', new Date(AGORA.getTime() + 30 * 60_000));
      },
    });

    await criar(gateway, new FixedClock(AGORA)).execute({ orderId: 'pedido-1' });

    /*
     * A chave carrega o id da cobrança substituída: dois cliques em "gerar
     * novo código" caem na mesma cobrança no Mercado Pago, em vez de deixarem
     * duas vivas.
     */
    expect(chaves).toEqual(['pedido-1-apos-111111111111']);
  });
});
