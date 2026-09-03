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
 * O cliente que paga em cima da hora.
 *
 * O prazo do Pix é de trinta minutos e muita gente paga no minuto vinte e nove:
 * abre o aplicativo do banco, procura o cartão, digita a senha. Antes, o
 * vencimento do relógio local fechava a cobrança como EXPIRED sem consultar
 * ninguém — e EXPIRED é terminal, então nada mais reabria.
 *
 * O dinheiro entrava na conta do lojista e o pedido nunca chegava à cozinha. É o
 * pior defeito possível num sistema de pedidos: os dois lados acham que deu
 * certo, e só o cliente descobre que não.
 */
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

const NASCIMENTO = new Date('2026-08-28T18:00:00Z');
const VENCE_EM = new Date('2026-08-28T18:30:00Z');

async function pixVencido() {
  const db = new InMemoryDatabase(PIZZARIA);
  const pedido = Order.create({
    id: 'pedido-1',
    establishmentId: PIZZARIA.id,
    source: 'SITE',
    customerName: 'Maria',
    address: Address.create('Rua das Flores, 10 - Centro, Pouso Alegre'),
    amount: Money.fromCents(4500),
    paymentStatus: 'PENDING',
  });
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
          expiresAt: VENCE_EM,
        };
      },
    }),
    new SequentialIds('pay'),
    new FixedClock(NASCIMENTO),
    PIZZARIA.id,
    async () => 'token-loja',
  ).execute({ orderId: pedido.id, method: 'pix' });

  return { db, pedido, criado };
}

/** Depois do prazo local — é quando a reconciliação passa. */
const DEPOIS_DO_PRAZO = new Date('2026-08-28T18:30:15Z');

describe('pagamento em cima do prazo', () => {
  it('o gateway diz que foi pago, e vale o gateway', async () => {
    /*
     * O caso que custava a venda: pagou aos 29min50s, a reconciliação passa aos
     * 30min15s. Antes, ela fechava como EXPIRED sem perguntar nada.
     */
    const { db, criado } = await pixVencido();

    const resultado = await new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Paid,
            amountCents: 4500,
            paidAt: new Date('2026-08-28T18:29:50Z'),
            resolvedExternalId: criado.externalId,
          };
        },
      }),
      new FixedClock(DEPOIS_DO_PRAZO),
      PIZZARIA.id,
      async () => 'token-loja',
    ).execute({ externalId: criado.externalId });

    expect(resultado).toBe('PAID');

    const pedido = db.orders.get('pedido-1');
    expect(pedido?.paymentStatus).toBe('PAID');
    // E, o que mais importa: o pedido volta para a fila da cozinha.
    expect(pedido?.isReleasedToKitchen).toBe(true);
  });

  it('o gateway confirma que não entrou, e aí sim expira', async () => {
    // A mesma conclusão de antes — tomada depois de perguntar, não no lugar de.
    const { db, criado } = await pixVencido();

    const resultado = await new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          return {
            status: PaymentStatus.Pending,
            amountCents: 4500,
            paidAt: null,
            resolvedExternalId: criado.externalId,
          };
        },
      }),
      new FixedClock(DEPOIS_DO_PRAZO),
      PIZZARIA.id,
      async () => 'token-loja',
    ).execute({ externalId: criado.externalId });

    expect(resultado).toBe('EXPIRED');
  });

  it('gateway fora do ar não fecha a cobrança', async () => {
    /*
     * Ficar pendente por engano custa uma consulta na próxima rodada. Expirar
     * por engano custa a venda, e é irreversível. Na dúvida, não fecha.
     */
    const { db, criado } = await pixVencido();

    const confirmar = new ConfirmPayment(
      new InMemoryUnitOfWork(db),
      gatewayFake({
        async getCharge() {
          throw new Error('502 Bad Gateway');
        },
      }),
      new FixedClock(DEPOIS_DO_PRAZO),
      PIZZARIA.id,
      async () => 'token-loja',
    );

    await expect(confirmar.execute({ externalId: criado.externalId })).rejects.toThrow();

    const pagamento = db.payments.get(criado.id);
    expect(pagamento?.status).toBe(PaymentStatus.Pending);
  });
});
