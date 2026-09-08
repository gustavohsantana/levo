import { describe, expect, it } from 'vitest';
import { RefundPayment } from '@/application/use-cases/payments/refund-payment';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { StartRoute } from '@/application/use-cases/routes/start-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  Address,
  Coordinates,
  ExternalServiceError,
  Money,
  Order,
  OrderAlreadyRoutedError,
  Payment,
  type OrderSourceKind,
  type PaymentGateway,
} from '@/core';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { FakeRoutingService, newDatabase, PIZZARIA } from '../helpers/fixtures';

/**
 * Estorno pelo painel do dono.
 *
 * O caso que criou isto: alguém pede e paga Pix às 3h da manhã, com a cozinha
 * fechada. Sem estorno aqui, a saída é ligar para o cliente e fazer Pix de volta
 * na mão — e nada no sistema registra que o dinheiro voltou.
 *
 * O que estes testes protegem é sempre a mesma coisa: **o painel não pode dizer
 * "estornado" quando o dinheiro não saiu da conta da loja.**
 */
const PONTO = Coordinates.create(-25.44, -49.28);

const AGORA = new Date('2026-09-01T03:10:00Z');

function pedidoPago(overrides: { id?: string; source?: OrderSourceKind } = {}) {
  const order = Order.create({
    id: overrides.id ?? 'pedido-1',
    establishmentId: PIZZARIA.id,
    source: overrides.source ?? 'SITE',
    externalId: overrides.source === 'IFOOD' ? 'ext-1' : null,
    customerName: 'Maria',
    address: Address.create('Rua das Flores, 10 - Centro, Pouso Alegre'),
    coordinates: PONTO,
    amount: Money.fromCents(7890),
    paymentMethod: 'ONLINE',
    paymentStatus: 'PENDING',
    now: new Date('2026-09-01T03:00:00Z'),
  });
  order.markPaymentPaid(new Date('2026-09-01T03:01:00Z'));
  order.pullEvents();
  return order;
}

function pagamento(orderId: string, status: 'PAID' | 'PENDING' | 'REFUNDED' = 'PAID') {
  const payment = Payment.create({
    id: `pay-${orderId}`,
    establishmentId: PIZZARIA.id,
    orderId,
    provider: 'MERCADO_PAGO',
    externalId: '176067700360',
    amountCents: 7890,
    qrCode: '00020126pix',
    now: new Date('2026-09-01T03:00:00Z'),
  });

  if (status === 'PAID') payment.markPaid(new Date('2026-09-01T03:01:00Z'));
  if (status === 'REFUNDED') {
    payment.markPaid(new Date('2026-09-01T03:01:00Z'));
    payment.markRefunded(new Date('2026-09-01T03:05:00Z'));
  }

  return payment;
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

/** Banco com um pedido pago do cardápio da loja, pronto para estornar. */
function cenario(overrides: { source?: OrderSourceKind; pagamento?: 'PAID' | 'PENDING' | 'REFUNDED' } = {}) {
  const db = newDatabase();
  const order = pedidoPago({ source: overrides.source });
  db.orders.set(order.id, order);
  const pago = pagamento(order.id, overrides.pagamento);
  db.payments.set(pago.id, pago);
  return { db, uow: new InMemoryUnitOfWork(db), order };
}

function refundPayment(
  uow: InMemoryUnitOfWork,
  gateway: PaymentGateway,
  token: () => Promise<string> = async () => 'token-loja',
) {
  return new RefundPayment(uow, gateway, new FixedClock(AGORA), PIZZARIA.id, token);
}

describe('estorno pelo painel', () => {
  it('devolve o valor inteiro com o token da loja e encerra o pedido', async () => {
    const { db, uow, order } = cenario();
    let recebido: { accessToken: string; externalId: string; orderId?: string } | null = null;

    const resultado = await refundPayment(
      uow,
      gatewayFake({
        async refund(input) {
          recebido = input;
          return {
            status: 'APPROVED',
            amountCents: 7890,
            refundedAt: AGORA,
            resolvedExternalId: '176067700360',
          };
        },
      }),
    ).execute(order.id);

    /*
     * O dinheiro é da loja e volta pela conta dela: o token do lojista é o que
     * sai daqui, e o pagamento estornado é o que o Levô gravou para o pedido —
     * nunca um id vindo da tela.
     */
    expect(recebido).toEqual({
      accessToken: 'token-loja',
      externalId: '176067700360',
      orderId: order.id,
    });

    expect(resultado).toEqual({ amountCents: 7890, emAndamento: false });
    expect(db.payments.get(`pay-${order.id}`)?.status).toBe('REFUNDED');
    expect(db.orders.get(order.id)?.paymentStatus).toBe('REFUNDED');
    expect(db.eventsNamed('order.payment_refunded')).toHaveLength(1);
  });

  it('o pedido estornado não é mais despachável', async () => {
    const { db, uow, order } = cenario();

    await refundPayment(
      uow,
      gatewayFake({
        async refund() {
          return {
            status: 'APPROVED',
            amountCents: 7890,
            refundedAt: AGORA,
            resolvedExternalId: '176067700360',
          };
        },
      }),
    ).execute(order.id);

    const depois = db.orders.get(order.id)!;
    expect(depois.status).toBe('CANCELLED');
    expect(depois.canBeRouted).toBe(false);

    const fila = await uow.run((repos) => repos.orders.listPending());
    expect(fila.map((o) => o.id)).not.toContain(order.id);

    /*
     * A trava de verdade está na entidade, não na consulta: uma tela aberta
     * antes do estorno ainda tem o pedido na lista, e o clique em "despachar"
     * chega ao servidor com ele dentro.
     */
    const plan = new PlanRoute(
      uow,
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('rota'),
      new FixedClock(AGORA),
    );
    await expect(
      plan.execute({ courierId: 'courier-1', orderIds: [order.id] }),
    ).rejects.toThrow(OrderAlreadyRoutedError);
  });

  it('tira da rota em andamento o pedido estornado', async () => {
    const { db, uow, order } = cenario();

    const clock = new FixedClock(AGORA);
    const rota = await new PlanRoute(
      uow,
      new FakeRoutingService(),
      new TwoOptOptimizer(),
      new SequentialIds('rota'),
      clock,
    ).execute({ courierId: 'courier-1', orderIds: [order.id] });
    await new StartRoute(uow, clock).execute(rota.id);

    await refundPayment(
      uow,
      gatewayFake({
        async refund() {
          return {
            status: 'APPROVED',
            amountCents: 7890,
            refundedAt: AGORA,
            resolvedExternalId: '176067700360',
          };
        },
      }),
    ).execute(order.id);

    const depois = db.routes.get(rota.id)!;
    expect(depois.stops.every((stop) => stop.status === 'FAILED')).toBe(true);
    expect(depois.pendingStops).toHaveLength(0);
    expect(db.orders.get(order.id)?.routeId).toBeNull();
  });

  it('Mercado Pago recusou: mostra o motivo dele e não mexe em nada', async () => {
    const { db, uow, order } = cenario();

    const useCase = refundPayment(
      uow,
      gatewayFake({
        async refund() {
          throw new ExternalServiceError('Mercado Pago', 'este pagamento já foi estornado.');
        },
      }),
    );

    await expect(useCase.execute(order.id)).rejects.toThrow(
      'Mercado Pago: este pagamento já foi estornado.',
    );

    /*
     * O ponto do teste. Marcar REFUNDED aqui deixaria o painel dizendo que o
     * dinheiro voltou enquanto ele segue na conta da loja — e o cliente
     * ligando por um estorno que ninguém fez.
     */
    expect(db.payments.get(`pay-${order.id}`)?.status).toBe('PAID');
    expect(db.orders.get(order.id)?.paymentStatus).toBe('PAID');
    expect(db.orders.get(order.id)?.status).toBe('NEW');
    const fila = await uow.run((repos) => repos.orders.listPending());
    expect(fila.map((o) => o.id)).toContain(order.id);
  });

  it('Mercado Pago fora do ar: diz que o dinheiro não voltou', async () => {
    const { db, uow, order } = cenario();

    const useCase = refundPayment(
      uow,
      gatewayFake({
        async refund() {
          throw new TypeError('fetch failed');
        },
      }),
    );

    await expect(useCase.execute(order.id)).rejects.toThrow(/NÃO voltou/);
    expect(db.payments.get(`pay-${order.id}`)?.status).toBe('PAID');
  });

  it('recusa pedido de marketplace sem falar com o Mercado Pago', async () => {
    const { db, uow, order } = cenario({ source: 'IFOOD' });
    let chamou = false;

    const useCase = refundPayment(
      uow,
      gatewayFake({
        async refund() {
          chamou = true;
          throw new Error('não deveria chegar aqui');
        },
      }),
    );

    /*
     * Pedido do iFood foi cobrado pela plataforma, na conta dela. Estornar por
     * aqui não devolveria nada ao cliente do aplicativo — e, no pior caso,
     * devolveria o pagamento de outro pedido.
     */
    await expect(useCase.execute(order.id)).rejects.toThrow(/iFood/);
    expect(chamou).toBe(false);
    expect(db.orders.get(order.id)?.paymentStatus).toBe('PAID');
    expect(db.orders.get(order.id)?.status).toBe('NEW');
  });

  it('não estorna o que ninguém pagou', async () => {
    const { uow, order } = cenario({ pagamento: 'PENDING' });

    await expect(refundPayment(uow, gatewayFake()).execute(order.id)).rejects.toThrow(
      /não tem pagamento confirmado/,
    );
  });

  it('estorno repetido não vai ao Mercado Pago de novo', async () => {
    const { uow, order } = cenario({ pagamento: 'REFUNDED' });

    await expect(refundPayment(uow, gatewayFake()).execute(order.id)).rejects.toThrow(
      /já foi estornado/,
    );
  });

  it('pedido para pagar na entrega não tem o que estornar', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    const order = Order.create({
      id: 'pedido-dinheiro',
      establishmentId: PIZZARIA.id,
      source: 'SITE',
      customerName: 'João',
      address: Address.create('Rua das Flores, 20 - Centro, Pouso Alegre'),
      amount: Money.fromCents(5000),
      paymentMethod: 'CASH',
    });
    db.orders.set(order.id, order);

    await expect(
      refundPayment(new InMemoryUnitOfWork(db), gatewayFake()).execute(order.id),
    ).rejects.toThrow(/não tem pagamento online/);
  });

  it('sem conta do Mercado Pago conectada, diz o que reconectar', async () => {
    const { uow, order } = cenario();

    const useCase = refundPayment(uow, gatewayFake(), async () => {
      throw new Error('sem credencial');
    });

    await expect(useCase.execute(order.id)).rejects.toThrow(/Integrações/);
  });

  it('estorno aceito mas ainda em processamento não é anunciado como concluído', async () => {
    const { uow, order } = cenario();

    const resultado = await refundPayment(
      uow,
      gatewayFake({
        async refund() {
          return {
            status: 'IN_PROCESS',
            amountCents: 7890,
            refundedAt: AGORA,
            resolvedExternalId: '176067700360',
          };
        },
      }),
    ).execute(order.id);

    expect(resultado.emAndamento).toBe(true);
  });
});
