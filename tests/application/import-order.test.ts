import { beforeEach, describe, expect, it } from 'vitest';
import { ImportOrderFromSource } from '@/application/use-cases/orders/import-order-from-source';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import {
  externalOrder,
  FailingGeocoder,
  FakeGeocoder,
  FakeOrderSource,
  newDatabase,
} from '../helpers/fixtures';

let db: InMemoryDatabase;
let importOrders: ImportOrderFromSource;
const clock = new FixedClock(new Date('2026-08-22T22:00:00Z'));

beforeEach(() => {
  db = newDatabase();
  importOrders = new ImportOrderFromSource(
    new InMemoryUnitOfWork(db),
    new FakeGeocoder(),
    new SequentialIds('order'),
    clock,
    'est-1',
  );
});

describe('ImportOrderFromSource', () => {
  it('importa pedidos novos e confirma o recebimento na plataforma', async () => {
    const source = new FakeOrderSource([externalOrder('IF-1'), externalOrder('IF-2')]);

    const result = await importOrders.execute(source);

    expect(result).toEqual({ imported: 2, duplicates: 0, failed: 0 });
    expect(db.orders.size).toBe(2);
    expect(source.acknowledged).toEqual(['IF-1', 'IF-2']);
  });

  it('⭐ não duplica quando o iFood reentrega a mesma leva', async () => {
    // O polling do iFood reentrega evento por projeto. Sem idempotência, o
    // motoboy sai com uma entrega fantasma no baú.
    const source = new FakeOrderSource([externalOrder('IF-1'), externalOrder('IF-2')]);

    await importOrders.execute(source);
    source.redeliver();
    const second = await importOrders.execute(source);

    expect(second).toEqual({ imported: 0, duplicates: 2, failed: 0 });
    expect(db.orders.size).toBe(2);
  });

  it('reprocessar a mesma leva dez vezes continua inofensivo', async () => {
    const source = new FakeOrderSource([externalOrder('IF-1')]);

    for (let attempt = 0; attempt < 10; attempt++) await importOrders.execute(source);

    expect(db.orders.size).toBe(1);
    expect(db.eventsNamed('order.created')).toHaveLength(1);
  });

  it('um pedido problemático não derruba a leva inteira', async () => {
    const source = new FakeOrderSource([
      externalOrder('IF-1'),
      { ...externalOrder('IF-2'), address: 'x' }, // endereço curto demais
      externalOrder('IF-3'),
    ]);

    const result = await importOrders.execute(source);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    // O que falhou fica sem ack e volta no próximo ciclo de polling.
    expect(source.acknowledged).toEqual(['IF-1', 'IF-3']);
  });

  it('importa mesmo com o geocodificador fora do ar', async () => {
    const offline = new ImportOrderFromSource(
      new InMemoryUnitOfWork(db),
      new FailingGeocoder(),
      new SequentialIds('order'),
      clock,
      'est-1',
    );
    const source = new FakeOrderSource([externalOrder('IF-1')]);

    const result = await offline.execute(source);

    // Perder o pedido porque o geocodificador piscou seria muito pior que
    // exibi-lo sem pino no mapa.
    expect(result.imported).toBe(1);
    expect([...db.orders.values()][0].isGeocoded).toBe(false);
    expect(db.eventsNamed('order.geocoding_failed')).toHaveLength(1);
  });

  it('preserva o horário real do pedido na plataforma', async () => {
    const source = new FakeOrderSource([externalOrder('IF-1')]);

    await importOrders.execute(source);

    expect([...db.orders.values()][0].createdAt).toEqual(new Date('2026-08-22T22:00:00Z'));
  });
});
