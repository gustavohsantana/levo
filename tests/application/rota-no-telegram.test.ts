import { beforeEach, describe, expect, it } from 'vitest';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates, Courier, PhoneNumber } from '@/core';
import { FakeRoutingService, makeOrder, newDatabase } from '../helpers/fixtures';

/**
 * Por onde a rota é avisada.
 *
 * O Telegram ganha do WhatsApp quando existe, e não passa pelo interruptor da
 * loja: o motoboy tocou no convite, e o consentimento dele É a autorização. O
 * WhatsApp continua atrás do interruptor porque lá ninguém autorizou nada — e
 * quem paga por um envio mal visto é o número da loja, como já aconteceu.
 */
const clock = new FixedClock(new Date('2026-09-02T12:00:00Z'));
const NORTE = Coordinates.create(-25.4, -49.27);

let db: InMemoryDatabase;

function planejador() {
  return new PlanRoute(
    new InMemoryUnitOfWork(db),
    new FakeRoutingService(),
    new TwoOptOptimizer(),
    new SequentialIds('route'),
    clock,
    undefined,
    'https://levoentregas.vercel.app',
  );
}

function pedido(): string[] {
  const o = makeOrder('order-1', NORTE);
  db.orders.set(o.id, o);
  return [o.id];
}

/** Substitui o motoboy do fixture por um que já autorizou o bot. */
function comTelegram(chatId: string): string {
  const atual = [...db.couriers.values()][0];
  const novo = new Courier(
    atual.id,
    atual.establishmentId,
    atual.name,
    PhoneNumber.create('35999990001'),
    true,
    chatId,
  );
  db.couriers.set(novo.id, novo);
  return novo.id;
}

beforeEach(() => {
  db = newDatabase();
});

describe('escolha do canal', () => {
  it('usa o Telegram mesmo com o aviso por WhatsApp desligado', async () => {
    db.whatsappRoutes = false;
    const courierId = comTelegram('987654321');

    const rota = await planejador().execute({ orderIds: pedido(), courierId });

    const aviso = db.notificacoes.get(rota.id)!;
    expect(aviso.channel).toBe('TELEGRAM');
    expect(aviso.destination).toBe('987654321');
  });

  it('prefere o Telegram quando os dois estão disponíveis', async () => {
    // Canal que o destinatário autorizou ganha do que ele só tolera.
    db.whatsappRoutes = true;
    const courierId = comTelegram('987654321');

    const rota = await planejador().execute({ orderIds: pedido(), courierId });

    expect(db.notificacoes.get(rota.id)!.channel).toBe('TELEGRAM');
  });

  it('sem Telegram e sem interruptor, não avisa por canal nenhum', async () => {
    db.whatsappRoutes = false;

    const rota = await planejador().execute({
      orderIds: pedido(),
      courierId: [...db.couriers.values()][0].id,
    });

    expect(db.notificacoes.has(rota.id)).toBe(false);
  });

  it('cai no WhatsApp quando o motoboy não autorizou o bot', async () => {
    db.whatsappRoutes = true;

    const rota = await planejador().execute({
      orderIds: pedido(),
      courierId: [...db.couriers.values()][0].id,
    });

    expect(db.notificacoes.get(rota.id)!.channel).toBe('WHATSAPP');
  });
});
