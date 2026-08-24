import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

/**
 * Dados de demonstração: uma pizzaria no centro de Pouso Alegre (MG) com
 * pedidos espalhados por endereços reais da cidade.
 *
 * As coordenadas são fixas de propósito — assim a demo sobe sem gastar
 * chamada de geocodificação e funciona offline. Todas foram geocodificadas
 * contra endereços que existem: coordenada inventada põe entrega no meio do
 * mato e destrói a credibilidade da demonstração no primeiro mapa aberto.
 *
 * Os destinos ficam deliberadamente espalhados em direções opostas — centro,
 * saída para o sul, zona norte — porque é o cenário em que a otimização tem o
 * que mostrar, que é justamente o que se quer ver na primeira execução.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ESTABLISHMENT_ID = '11111111-1111-1111-1111-111111111111';

const COURIERS = [
  { name: 'Jefferson Alves', phone: '35999990001', active: true },
  { name: 'Rodrigo Lima', phone: '35999990002', active: true },
  { name: 'Wesley Souza', phone: '35999990003', active: false },
];

/** Bairros reais, em direções bem diferentes a partir do centro. */
const ORDERS = [
  { customerName: 'Maria Aparecida Rocha', phone: '35988880001', address: 'Rua Adolfo Olinto, 300 - Centro, Pouso Alegre', lat: -22.229914, lng: -45.935824, amount: 8990, notes: 'Portão azul, interfone 12' },
  { customerName: 'Carlos Eduardo Prado', phone: '35988880002', address: 'Av. Doutor Lisboa, 500 - Centro, Pouso Alegre', lat: -22.232672, lng: -45.934512, amount: 12450, notes: null },
  { customerName: 'Juliana Ferraz', phone: '35988880003', address: 'Rua Bueno Brandão, 400 - Centro, Pouso Alegre', lat: -22.231367, lng: -45.939807, amount: 6790, notes: 'Sem cebola' },
  { customerName: 'Rafael Nogueira', phone: '35988880004', address: 'Av. Prefeito Olavo Gomes de Oliveira, 1000 - Pouso Alegre', lat: -22.285615, lng: -45.911669, amount: 9900, notes: null },
  { customerName: 'Beatriz Camargo', phone: '35988880005', address: 'Av. Vereador Antônio da Costa Rios, 800 - Pouso Alegre', lat: -22.236512, lng: -45.932219, amount: 7450, notes: 'Deixar na portaria' },
  { customerName: 'Tiago Bittencourt', phone: '35988880006', address: 'Av. Tuany Toledo, 1200 - Pouso Alegre', lat: -22.219169, lng: -45.917128, amount: 5490, notes: null },
  { customerName: 'Fernanda Klein', phone: '35988880007', address: 'Av. Perimetral, 500 - Pouso Alegre', lat: -22.226772, lng: -45.917395, amount: 10900, notes: 'Troco para R$ 150' },
];

async function main() {
  /*
   * As credenciais de marketplace sobrevivem ao seed.
   *
   * Elas caem por cascata quando o estabelecimento é apagado, e recuperá-las
   * custa caro: o lojista precisa autorizar de novo no portal do iFood, com
   * código de vinculação e tudo. Guardar e devolver aqui evita perder a
   * integração toda vez que se recarrega os dados de demonstração — e o
   * `establishmentId` é fixo, então elas voltam para o mesmo dono.
   */
  const credenciais = await prisma.integrationCredential.findMany();
  if (credenciais.length > 0) {
    console.log(`Preservando ${credenciais.length} credencial(is) de integração...`);
  }

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
      address: 'Rua Comendador José Garcia, 100 - Centro, Pouso Alegre',
      lat: -22.230747,
      lng: -45.934612,
    },
  });

  // Devolve as credenciais ao estabelecimento recriado, que tem o mesmo id.
  for (const credencial of credenciais) {
    const { id: _ignorado, ...dados } = credencial;
    await prisma.integrationCredential.create({
      data: { ...dados, establishmentId: establishment.id },
    });
  }

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
  const orderRows = ORDERS.map((order, index) => ({
    id: randomUUID(),
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
  }));

  await prisma.order.createMany({ data: orderRows });

  /**
   * Os eventos correspondentes.
   *
   * O seed escreve direto no banco, sem passar pelo domínio — então precisa
   * registrar os eventos na mão. Sem isto, `/admin/piloto` mostraria "1 pedido"
   * enquanto o painel mostra 9, e um demo que se contradiz derruba a confiança
   * em tudo que ele afirma.
   */
  await prisma.domainEventLog.createMany({
    data: orderRows.map((order) => ({
      establishmentId: establishment.id,
      name: 'order.created',
      aggregateId: order.id,
      payload: { source: 'MANUAL', hasCoordinates: true, seed: true },
      occurredAt: order.createdAt,
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
