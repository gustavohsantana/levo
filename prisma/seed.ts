import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

/**
 * Dados de demonstração: uma pizzaria no centro de Curitiba com pedidos
 * espalhados por bairros reais.
 *
 * As coordenadas são fixas de propósito — assim a demo sobe sem gastar
 * chamada de geocodificação e funciona offline. E os endereços ficam
 * deliberadamente espalhados em direções opostas: é o cenário em que a
 * otimização tem o que mostrar, que é justamente o que se quer ver na
 * primeira execução.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ESTABLISHMENT_ID = '11111111-1111-1111-1111-111111111111';

const COURIERS = [
  { name: 'Jefferson Alves', phone: '41999990001', active: true },
  { name: 'Rodrigo Lima', phone: '41999990002', active: true },
  { name: 'Wesley Souza', phone: '41999990003', active: false },
];

/** Bairros reais, em direções bem diferentes a partir do centro. */
const ORDERS = [
  { customerName: 'Maria Aparecida Rocha', phone: '41988880001', address: 'Rua Trajano Reis, 300 - São Francisco, Curitiba', lat: -25.4231, lng: -49.2761, amount: 8990, notes: 'Portão azul, interfone 12' },
  { customerName: 'Carlos Eduardo Prado', phone: '41988880002', address: 'Av. Sete de Setembro, 4200 - Batel, Curitiba', lat: -25.4413, lng: -49.2919, amount: 12450, notes: null },
  { customerName: 'Juliana Ferraz', phone: '41988880003', address: 'Rua Padre Anchieta, 1500 - Bigorrilho, Curitiba', lat: -25.4318, lng: -49.3018, amount: 6790, notes: 'Sem cebola' },
  { customerName: 'Rafael Nogueira', phone: '41988880004', address: 'Av. Cândido de Abreu, 500 - Centro Cívico, Curitiba', lat: -25.4162, lng: -49.2695, amount: 9900, notes: null },
  { customerName: 'Beatriz Camargo', phone: '41988880005', address: 'Rua Itupava, 900 - Alto da Rua XV, Curitiba', lat: -25.4288, lng: -49.2542, amount: 7450, notes: 'Deixar na portaria' },
  { customerName: 'Tiago Bittencourt', phone: '41988880006', address: 'Av. Iguaçu, 2200 - Água Verde, Curitiba', lat: -25.4515, lng: -49.2822, amount: 5490, notes: null },
  { customerName: 'Fernanda Klein', phone: '41988880007', address: 'Rua Mateus Leme, 2400 - São Lourenço, Curitiba', lat: -25.4086, lng: -49.2779, amount: 10900, notes: 'Troco para R$ 150' },
  { customerName: 'Otávio Mendes', phone: '41988880008', address: 'Rua Brigadeiro Franco, 1800 - Mercês, Curitiba', lat: -25.4265, lng: -49.2905, amount: 6290, notes: null },
];

async function main() {
  console.log('Limpando dados anteriores...');
  await prisma.courierPing.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.domainEventLog.deleteMany({});
  await prisma.courier.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.establishment.deleteMany({});

  const establishment = await prisma.establishment.create({
    data: {
      id: ESTABLISHMENT_ID,
      name: 'Pizzaria do Zé',
      address: 'Rua XV de Novembro, 100 - Centro, Curitiba',
      lat: -25.4284,
      lng: -49.2733,
    },
  });

  await prisma.user.create({
    data: {
      establishmentId: establishment.id,
      email: 'ze@pizzaria.com.br',
      name: 'Zé',
      passwordHash: bcrypt.hashSync('pizzaria123', 10),
    },
  });

  await prisma.courier.createMany({
    data: COURIERS.map((courier) => ({ ...courier, establishmentId: establishment.id })),
  });

  const now = Date.now();
  await prisma.order.createMany({
    data: ORDERS.map((order, index) => ({
      establishmentId: establishment.id,
      source: 'MANUAL' as const,
      customerName: order.customerName,
      customerPhone: order.phone,
      address: order.address,
      lat: order.lat,
      lng: order.lng,
      amountCents: order.amount,
      notes: order.notes,
      trackingToken: randomUUID().replace(/-/g, '').slice(0, 22),
      // Espalhados nos últimos 40 minutos, na ordem em que "chegaram".
      createdAt: new Date(now - (ORDERS.length - index) * 5 * 60_000),
    })),
  });

  console.log('');
  console.log('  Pronto.');
  console.log('  ─────────────────────────────────────');
  console.log(`  Estabelecimento : ${establishment.name}`);
  console.log(`  Motoboys        : ${COURIERS.length}`);
  console.log(`  Pedidos         : ${ORDERS.length}`);
  console.log('');
  console.log('  Entre em http://localhost:3000');
  console.log('  E-mail : ze@pizzaria.com.br');
  console.log('  Senha  : pizzaria123');
  console.log('');
}

main()
  .catch((cause) => {
    console.error(cause);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
