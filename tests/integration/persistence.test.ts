import 'dotenv/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { PrismaUnitOfWork } from '@/infrastructure/persistence/prisma/unit-of-work';
import { CreateOrder } from '@/application/use-cases/orders/create-order';
import { ImportOrderFromSource } from '@/application/use-cases/orders/import-order-from-source';
import { PlanRoute } from '@/application/use-cases/routes/plan-route';
import { CompleteStop } from '@/application/use-cases/routes/complete-stop';
import { StartRoute } from '@/application/use-cases/routes/start-route';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import { FixedClock, SequentialIds } from '@/infrastructure/fakes/in-memory';
import { Coordinates } from '@/core';
import { externalOrder, FakeGeocoder, FakeOrderSource, FakeRoutingService } from '../helpers/fixtures';

const EST_ID = '11111111-1111-1111-1111-111111111111';
const COURIER_ID = '22222222-2222-2222-2222-222222222222';

const prisma = getPrismaClient(process.env.DATABASE_URL!);
const uow = new PrismaUnitOfWork(prisma, EST_ID);
const clock = new FixedClock(new Date('2026-08-22T22:00:00Z'));

let ids: SequentialIds;

beforeAll(async () => {
  await prisma.establishment.upsert({
    where: { id: EST_ID },
    create: {
      id: EST_ID,
      name: 'Pizzaria do Zé',
      address: 'Rua XV de Novembro, 100 - Centro, Curitiba',
      lat: -25.4284,
      lng: -49.2733,
    },
    update: {},
  });
});

beforeEach(async () => {
  await prisma.courierPing.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.route.deleteMany({ where: { establishmentId: EST_ID } });
  await prisma.order.deleteMany({ where: { establishmentId: EST_ID } });
  await prisma.domainEventLog.deleteMany({ where: { establishmentId: EST_ID } });
  await prisma.courier.deleteMany({ where: { establishmentId: EST_ID } });
  await prisma.courier.create({
    data: { id: COURIER_ID, establishmentId: EST_ID, name: 'Jefferson', phone: '41999990001' },
  });
  ids = new SequentialIds(`t${Date.now()}${Math.random().toString(36).slice(2, 6)}`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('persistência', () => {
  it('grava e reidrata um pedido sem perder nada pelo caminho', async () => {
    const createOrder = new CreateOrder(uow, new FakeGeocoder(), ids, clock, EST_ID);

    const created = await createOrder.execute({
      customerName: 'Maria Silva',
      customerPhone: '(41) 99999-9999',
      address: 'Rua Trajano Reis, 300 - São Francisco, Curitiba',
      amountReais: 69.9,
      notes: 'Sem cebola',
    });

    const loaded = await uow.run((repos) => repos.orders.findById(created.id));

    expect(loaded!.customerName).toBe('Maria Silva');
    expect(loaded!.customerPhone!.whatsapp).toBe('5541999999999');
    expect(loaded!.amount.cents).toBe(6990);
    expect(loaded!.notes).toBe('Sem cebola');
    expect(loaded!.coordinates).not.toBeNull();
    expect(loaded!.trackingToken.value).toBe(created.trackingToken.value);
  });

  it('⭐ o banco recusa o mesmo pedido externo duas vezes', async () => {
    // Segunda linha de defesa da idempotência: mesmo que duas leituras
    // concorrentes passem pela checagem da aplicação, a constraint barra.
    await prisma.order.create({
      data: {
        establishmentId: EST_ID,
        source: 'IFOOD',
        externalId: 'IF-999',
        customerName: 'Cliente',
        address: 'Rua A, 1',
        trackingToken: 'tok-primeiro-abcdefgh',
      },
    });

    await expect(
      prisma.order.create({
        data: {
          establishmentId: EST_ID,
          source: 'IFOOD',
          externalId: 'IF-999',
          customerName: 'Cliente',
          address: 'Rua A, 1',
          trackingToken: 'tok-segundo-abcdefghi',
        },
      }),
    ).rejects.toThrow();
  });

  it('permite vários pedidos manuais, que não têm id externo', async () => {
    // No Postgres NULLs são distintos entre si num índice único — é o que faz
    // a mesma constraint servir para pedido manual e pedido de plataforma.
    const createOrder = new CreateOrder(uow, new FakeGeocoder(), ids, clock, EST_ID);

    await createOrder.execute({ customerName: 'Ana', address: 'Rua A, 100 - Curitiba' });
    await createOrder.execute({ customerName: 'Bruno', address: 'Rua B, 200 - Curitiba' });

    expect(await prisma.order.count({ where: { establishmentId: EST_ID } })).toBe(2);
  });

  it('importação continua idempotente com banco real', async () => {
    const importOrders = new ImportOrderFromSource(uow, new FakeGeocoder(), ids, clock, EST_ID);
    const source = new FakeOrderSource([externalOrder('IF-1'), externalOrder('IF-2')]);

    await importOrders.execute(source);
    source.redeliver();
    const second = await importOrders.execute(source);

    expect(second.duplicates).toBe(2);
    expect(await prisma.order.count({ where: { establishmentId: EST_ID } })).toBe(2);
  });

  it('planeja a rota inteira numa transação e persiste as paradas em ordem', async () => {
    const createOrder = new CreateOrder(uow, new FakeGeocoder(Coordinates.create(-25.40, -49.27)), ids, clock, EST_ID);
    const a = await createOrder.execute({ customerName: 'A', address: 'Rua A, 100 - Curitiba' });

    const createOrderB = new CreateOrder(uow, new FakeGeocoder(Coordinates.create(-25.46, -49.30)), ids, clock, EST_ID);
    const b = await createOrderB.execute({ customerName: 'B', address: 'Rua B, 200 - Curitiba' });

    const planRoute = new PlanRoute(uow, new FakeRoutingService(), new TwoOptOptimizer(), ids, clock);
    const route = await planRoute.execute({ courierId: COURIER_ID, orderIds: [a.id, b.id] });

    const stored = await prisma.route.findUniqueOrThrow({
      where: { id: route.id },
      include: { stops: { orderBy: { position: 'asc' } } },
    });

    expect(stored.stops).toHaveLength(2);
    expect(stored.stops.map((s) => s.position)).toEqual([1, 2]);
    expect(stored.baselineDurationSeconds).toBeGreaterThan(0);

    const orders = await prisma.order.findMany({ where: { establishmentId: EST_ID } });
    expect(orders.every((order) => order.status === 'IN_ROUTE')).toBe(true);
  });

  it('grava os eventos de domínio no mesmo commit da mudança', async () => {
    const createOrder = new CreateOrder(uow, new FakeGeocoder(), ids, clock, EST_ID);
    await createOrder.execute({ customerName: 'Ana', address: 'Rua A, 100 - Curitiba' });

    const events = await prisma.domainEventLog.findMany({ where: { establishmentId: EST_ID } });

    expect(events.map((event) => event.name)).toContain('order.created');
  });

  it('entrega marca pedido, parada e rota de uma vez só', async () => {
    const createOrder = new CreateOrder(uow, new FakeGeocoder(Coordinates.create(-25.40, -49.27)), ids, clock, EST_ID);
    const order = await createOrder.execute({ customerName: 'A', address: 'Rua A, 100 - Curitiba' });

    const planRoute = new PlanRoute(uow, new FakeRoutingService(), new TwoOptOptimizer(), ids, clock);
    const route = await planRoute.execute({ courierId: COURIER_ID, orderIds: [order.id] });
    await new StartRoute(uow, clock).execute(route.id);

    await new CompleteStop(uow, clock).execute(route.id, {
      stopId: route.stops[0].id,
      outcome: 'DELIVERED',
    });

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('DELIVERED');
    expect((await prisma.route.findUniqueOrThrow({ where: { id: route.id } })).status).toBe('FINISHED');
  });

  it('⭐ o arame de tropeço barra consulta sem filtro de estabelecimento', async () => {
    // Se um dia alguém escrever uma consulta solta fora dos repositórios, ela
    // falha alto — em vez de devolver dados de outro cliente em silêncio.
    await expect(prisma.order.findMany({})).rejects.toThrow(/tenant-guard/);
    await expect(prisma.route.count({ where: { status: 'PLANNED' } })).rejects.toThrow(/tenant-guard/);
  });
});
