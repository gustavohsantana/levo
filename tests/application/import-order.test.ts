import { beforeEach, describe, expect, it } from 'vitest';
import { Coordinates } from '@/core';
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

    expect(result).toEqual({ imported: 2, duplicates: 0, failed: 0, updated: 0 });
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

    expect(second).toEqual({ imported: 0, duplicates: 2, failed: 0, updated: 0 });
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
    /*
     * O quebrado tambem sai da fila. Este teste ja exigiu o contrario — o que
     * falhava ficava sem ack para tentar de novo — e a homologacao do iFood
     * cobrou a conta: endereco invalido nunca vira valido, entao o pedido
     * voltava a cada 30 segundos, falhava de novo e levava junto os eventos do
     * mesmo lote. Perdemos ponto de acknowledgment por causa de um pedido so.
     *
     * Falha passageira (rede, banco) continua sem ack e volta. A diferenca e
     * se repetir tem chance de dar outro resultado.
     */
    expect(source.acknowledged).toEqual(['IF-1', 'IF-2', 'IF-3']);
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

describe('ImportOrderFromSource — acknowledgment', () => {
  it('chama o acknowledgment mesmo quando nada foi importado', async () => {
    /*
     * O adapter pode ter consumido eventos que não viram pedido — cancelamento,
     * mudança de status — e precisa da chamada para tirá-los da fila. Pular o
     * acknowledgment quando a leva vem sem pedido novo deixava esses eventos
     * voltando a cada ciclo até expirarem horas depois.
     */
    const source = new FakeOrderSource([]);

    const result = await importOrders.execute(source);

    expect(result).toEqual({ imported: 0, duplicates: 0, failed: 0, updated: 0 });
    expect(source.acknowledgeCalls).toBe(1);
    expect(source.acknowledged).toEqual([]);
  });
});

describe('ImportOrderFromSource — mudanças de estado na plataforma', () => {
  /**
   * O pedido não vive só dentro do Levô: o cliente cancela e o marketplace
   * conclui sem passar por aqui. Antes esses eventos eram reconhecidos e
   * descartados, e o painel seguia mostrando como pendente um pedido cancelado
   * horas antes — com o motoboy indo entregar algo que já não existia.
   */
  it('marca como cancelado o pedido cancelado na plataforma', async () => {
    const source = new FakeOrderSource([externalOrder('IF-1')]);
    await importOrders.execute(source);

    source.pending = [];
    source.changes = [{ externalId: 'IF-1', status: 'CANCELLED' }];

    const result = await importOrders.execute(source);

    expect(result.updated).toBe(1);
    const order = [...db.orders.values()].find((o) => o.externalId === 'IF-1')!;
    expect(order.status).toBe('CANCELLED');
  });

  it('marca como entregue o pedido concluído na plataforma', async () => {
    const source = new FakeOrderSource([externalOrder('IF-2')]);
    await importOrders.execute(source);

    source.pending = [];
    source.changes = [{ externalId: 'IF-2', status: 'CONCLUDED' }];

    await importOrders.execute(source);

    const order = [...db.orders.values()].find((o) => o.externalId === 'IF-2')!;
    expect(order.status).toBe('DELIVERED');
  });

  it('tira o pedido cancelado da rota em que estava', async () => {
    const source = new FakeOrderSource([externalOrder('IF-3')]);
    await importOrders.execute(source);

    const order = [...db.orders.values()].find((o) => o.externalId === 'IF-3')!;
    order.locateAt(Coordinates.create(-22.23, -45.93));
    order.assignToRoute('rota-1');
    db.orders.set(order.id, order);

    source.pending = [];
    source.changes = [{ externalId: 'IF-3', status: 'CANCELLED' }];
    await importOrders.execute(source);

    const depois = [...db.orders.values()].find((o) => o.externalId === 'IF-3')!;
    expect(depois.status).toBe('CANCELLED');
    // Some da rota: o motoboy não pode sair com uma parada que não existe mais.
    expect(depois.routeId).toBeNull();
  });

  it('ignora mudança de pedido que não conhece, sem quebrar o ciclo', async () => {
    const source = new FakeOrderSource([]);
    source.changes = [{ externalId: 'nunca-importado', status: 'CANCELLED' }];

    const result = await importOrders.execute(source);

    expect(result.updated).toBe(0);
  });

  /*
   * Este teste já exigiu o contrário: entrega feita não regredia por
   * cancelamento tardio, para não desfazer o trabalho do motoboy.
   *
   * A regra virou depois de custar uma tarde. O iFood cancelou um pedido e o
   * painel seguiu mostrando "Entregue" — sem log, sem evento, sem nada para
   * investigar. Quem cancela decide se o lojista recebe, e esconder isso
   * esconde justamente a parte que dói: a comida saiu e o dinheiro não vem.
   *
   * O trabalho do motoboy não se perde: ele vive na parada da rota, que é outro
   * registro. E o evento carrega `entregue` para quem for auditar.
   */
  it('grava evento quando a plataforma muda o estado', async () => {
    /*
     * Sem isto o pedido mudava de estado sem rastro: o historico mostrava so
     * `order.created` para um pedido cancelado horas antes, e nao dava para
     * saber se quem cancelou foi o cliente, a plataforma ou nos.
     */
    const source = new FakeOrderSource([externalOrder('IF-5')]);
    await importOrders.execute(source);
    db.events.length = 0;

    source.pending = [];
    source.changes = [{ externalId: 'IF-5', status: 'CANCELLED' }];
    await importOrders.execute(source);

    expect(db.events.map((e) => e.name)).toContain('order.cancelled_externally');
  });

  it('regride um pedido entregue quando a plataforma cancela', async () => {
    const source = new FakeOrderSource([externalOrder('IF-4')]);
    await importOrders.execute(source);

    const order = [...db.orders.values()].find((o) => o.externalId === 'IF-4')!;
    order.locateAt(Coordinates.create(-22.23, -45.93));
    order.assignToRoute('rota-1');
    order.markDelivered();
    db.orders.set(order.id, order);

    source.pending = [];
    source.changes = [{ externalId: 'IF-4', status: 'CANCELLED' }];
    await importOrders.execute(source);

    expect([...db.orders.values()].find((o) => o.externalId === 'IF-4')!.status).toBe('CANCELLED');
  });
});

describe('pedido de retirada importado', () => {
  it('entra no painel, marcado como retirada', async () => {
    /*
     * A ideia do Levô é centralizar TODOS os pedidos das plataformas — o dono
     * não pode ter que vigiar o app do aiqfome para os de balcão. Então a
     * retirada entra também, só que sem virar rota.
     */
    const retirada = { ...externalOrder('AIQ-PICKUP'), address: '', pickup: true };
    const source = new FakeOrderSource([retirada]);

    const result = await importOrders.execute(source);

    expect(result.imported).toBe(1);
    const order = [...db.orders.values()].find((o) => o.externalId === 'AIQ-PICKUP');
    expect(order?.isPickup).toBe(true);
  });

  it('não paga taxa de entrega e não bloqueia por endereço sem pino', async () => {
    const retirada = {
      ...externalOrder('AIQ-PICKUP-2'),
      address: '',
      deliveryFeeCents: 800, // o marketplace mandou uma taxa; retirada ignora
      pickup: true,
    };

    await importOrders.execute(new FakeOrderSource([retirada]));

    const order = [...db.orders.values()].find((o) => o.externalId === 'AIQ-PICKUP-2');
    expect(order?.deliveryFee.cents).toBe(0);
    // Sem endereço e sem pino, uma entrega ficaria marcada como "sem localização";
    // a retirada não, porque não vai virar rota.
    expect(order?.isGeocoded).toBe(false);
  });

  it('a entrega comum segue geocodificando e cobrando normalmente', async () => {
    // A mudança não pode contaminar o caso comum, que é a maioria.
    const entrega = { ...externalOrder('AIQ-ENTREGA'), deliveryFeeCents: 700 };

    await importOrders.execute(new FakeOrderSource([entrega]));

    const order = [...db.orders.values()].find((o) => o.externalId === 'AIQ-ENTREGA');
    expect(order?.isPickup).toBe(false);
    expect(order?.deliveryFee.cents).toBe(700);
  });
});
