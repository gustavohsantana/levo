/**
 * Historico de pedidos para avaliar e demonstrar a tela de Relatorios.
 *
 * A base de exemplo tinha dois pedidos, os dois em aberto — a tela abria vazia e
 * nao dava para julgar nada. Isto gera seis semanas de movimento com a forma que
 * um delivery tem de verdade: sexta e sabado dobram, segunda e o fundo do poco,
 * o pico e entre 19h e 21h, e uma parte cancela.
 *
 * Idempotente: apaga o que ele mesmo criou antes de recriar. Reconhece o que e
 * dele por `externalId` comecando com `demo-hist-`, entao nunca toca em pedido
 * de verdade.
 *
 * Uso:  npx tsx infra/historico-de-exemplo.mts
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';

const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);

const est = await prisma.establishment.findFirst({ select: { id: true, name: true } });
if (!est) throw new Error('nenhum estabelecimento');

const couriers = await prisma.courier.findMany({
  where: { establishmentId: est.id, active: true },
  select: { id: true, name: true },
});
if (couriers.length === 0) throw new Error('nenhum entregador ativo');

const produtos = await prisma.product.findMany({
  where: { establishmentId: est.id, active: true },
  select: { name: true, priceCents: true },
});

console.log(`${est.name} — ${couriers.length} entregadores, ${produtos.length} produtos\n`);

const MARCA = 'demo-hist-';

// Limpa so o que este script cria. As rotas caem junto pelo token marcado.
const antigos = await prisma.order.findMany({
  where: { establishmentId: est.id, externalId: { startsWith: MARCA } },
  select: { id: true },
});
if (antigos.length > 0) {
  await prisma.order.deleteMany({ where: { id: { in: antigos.map((o) => o.id) } } });
  console.log(`removidos ${antigos.length} pedidos do historico anterior`);
}
const rotasAntigas = await prisma.route.deleteMany({
  where: { establishmentId: est.id, accessToken: { startsWith: MARCA } },
});
if (rotasAntigas.count > 0) console.log(`removidas ${rotasAntigas.count} rotas anteriores\n`);

/** Aleatorio com semente: rodar de novo produz o mesmo historico. */
let semente = 20260901;
function rand(): number {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
const entre = (a: number, b: number) => a + rand() * (b - a);
const inteiro = (a: number, b: number) => Math.floor(entre(a, b + 1));
const escolher = <T,>(lista: T[]): T => lista[Math.floor(rand() * lista.length)];

/** Pesos que somam 1. A mistura de plataformas de um delivery que ja se virou. */
const PLATAFORMAS = [
  { fonte: 'IFOOD' as const, peso: 0.45, ticket: [4500, 13000], minutos: [32, 58] },
  { fonte: 'SITE' as const, peso: 0.25, ticket: [3500, 11000], minutos: [25, 48] },
  { fonte: 'AIQFOME' as const, peso: 0.12, ticket: [3800, 9500], minutos: [30, 55] },
  { fonte: 'MANUAL' as const, peso: 0.18, ticket: [3000, 9000], minutos: [22, 45] },
];

function sortearPlataforma() {
  const r = rand();
  let acumulado = 0;
  for (const p of PLATAFORMAS) {
    acumulado += p.peso;
    if (r <= acumulado) return p;
  }
  return PLATAFORMAS[0];
}

const BAIRROS = [
  { nome: 'Centro', lat: -22.2306, lng: -45.9366 },
  { nome: 'Pitangueiras', lat: -22.2402, lng: -45.9481 },
  { nome: 'Fátima', lat: -22.2251, lng: -45.9448 },
  { nome: 'São Geraldo', lat: -22.2189, lng: -45.9298 },
  { nome: 'Jardim Aeroporto', lat: -22.2478, lng: -45.9219 },
  { nome: 'Faisqueira', lat: -22.2154, lng: -45.9531 },
];
const RUAS = ['Rua das Flores', 'Av. Getúlio Vargas', 'Rua João Pinheiro', 'Rua Rosa Campanella',
  'Av. Vereador Antônio da Costa Rios', 'Rua Adolfo Olinto', 'Rua Silviano Brandão'];
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Patrícia', 'Rafael',
  'Sabrina', 'Thiago', 'Vanessa', 'William'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Almeida', 'Rocha'];

/** Meia-noite de Brasilia em UTC. O relatorio agrupa pelo dia daqui. */
function diaBase(diasAtras: number): Date {
  const agora = new Date();
  const brasilia = new Date(agora.getTime() - 180 * 60_000);
  const d = new Date(Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), brasilia.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return new Date(d.getTime() + 180 * 60_000);
}

/** Sexta e sabado dobram; segunda e o fundo do poco. */
function pedidosDoDia(diaDaSemana: number): number {
  const base = [14, 10, 13, 15, 18, 34, 30][diaDaSemana];
  return Math.max(4, Math.round(base * entre(0.78, 1.22)));
}

const DIAS = 42;
const pedidosParaCriar: Array<{
  dados: Record<string, unknown>;
  itens: Array<{ name: string; quantity: number; unitPriceCents: number }>;
  courierId: string | null;
  dia: number;
}> = [];

let sequencia = 0;

for (let atras = DIAS; atras >= 1; atras--) {
  const base = diaBase(atras);
  // getUTCDay do instante local de Brasilia; base ja aponta 00:00 de la.
  const diaSemana = new Date(base.getTime() - 180 * 60_000).getUTCDay();
  const quantos = pedidosDoDia(diaSemana);

  for (let i = 0; i < quantos; i++) {
    const plataforma = sortearPlataforma();

    /*
     * Duas ondas: almoco menor, jantar dominante. Um delivery que vende igual o
     * dia inteiro nao existe, e um relatorio que mostra isso nao ensina nada.
     */
    const almoco = rand() < 0.22;
    const hora = almoco ? entre(11, 13.5) : entre(18.5, 22.5);
    const criado = new Date(base.getTime() + hora * 3_600_000);

    const sorte = rand();
    const status = sorte < 0.945 ? 'DELIVERED' : sorte < 0.99 ? 'CANCELLED' : 'FAILED';

    const bairro = escolher(BAIRROS);
    const total = Math.round(entre(plataforma.ticket[0], plataforma.ticket[1]) / 50) * 50;
    const taxa = [500, 700, 900, 1200][inteiro(0, 3)];
    const minutos = entre(plataforma.minutos[0], plataforma.minutos[1]);

    const itens: Array<{ name: string; quantity: number; unitPriceCents: number }> = [];
    if (produtos.length > 0) {
      for (let n = 0; n < inteiro(1, 3); n++) {
        const p = escolher(produtos);
        itens.push({ name: p.name, quantity: inteiro(1, 2), unitPriceCents: p.priceCents });
      }
    }

    sequencia += 1;
    const courierId = status === 'DELIVERED' ? escolher(couriers).id : null;

    pedidosParaCriar.push({
      dia: atras,
      courierId,
      itens,
      dados: {
        id: randomUUID(),
        establishmentId: est.id,
        source: plataforma.fonte,
        externalId: `${MARCA}${String(sequencia).padStart(5, '0')}`,
        displayId: plataforma.fonte === 'MANUAL' ? null : String(1000 + sequencia),
        customerName: `${escolher(NOMES)} ${escolher(SOBRENOMES)}`,
        customerPhone: `359${inteiro(80000000, 99999999)}`,
        address: `${escolher(RUAS)}, ${inteiro(10, 1800)} - ${bairro.nome}, Pouso Alegre`,
        lat: bairro.lat + entre(-0.004, 0.004),
        lng: bairro.lng + entre(-0.004, 0.004),
        amountCents: total,
        deliveryFeeCents: taxa,
        paymentMethod: escolher(['CASH', 'CREDIT', 'DEBIT', 'PIX', 'ONLINE'] as const),
        paymentStatus: status === 'DELIVERED' ? 'PAID' : null,
        status,
        trackingToken: randomUUID().replace(/-/g, '').slice(0, 24),
        createdAt: criado,
        confirmedAt: new Date(criado.getTime() + entre(1, 4) * 60_000),
        readyAt: new Date(criado.getTime() + entre(12, 25) * 60_000),
        deliveredAt: status === 'DELIVERED' ? new Date(criado.getTime() + minutos * 60_000) : null,
      },
    });
  }
}

console.log(`gerando ${pedidosParaCriar.length} pedidos em ${DIAS} dias…`);

for (const p of pedidosParaCriar) {
  const data = {
    ...p.dados,
    ...(p.itens.length > 0 ? { items: { create: p.itens } } : {}),
  } as Parameters<typeof prisma.order.create>[0]['data'];

  await prisma.order.create({ data });
}

/*
 * Uma rota por entregador por dia, com o que ele entregou.
 *
 * Sem rota, "por entregador" fica vazio: quem entregou sai da rota, nao do
 * pedido. E rota e como o dono organiza o dia de verdade.
 */
let rotas = 0;
for (let atras = DIAS; atras >= 1; atras--) {
  for (const courier of couriers) {
    const doDia = pedidosParaCriar.filter((p) => p.dia === atras && p.courierId === courier.id);
    if (doDia.length === 0) continue;

    doDia.sort((a, b) => (a.dados.createdAt as Date).getTime() - (b.dados.createdAt as Date).getTime());
    const primeiro = doDia[0].dados.createdAt as Date;
    const ultimo = doDia[doDia.length - 1].dados.deliveredAt as Date;

    const rota = await prisma.route.create({
      data: {
        establishmentId: est.id,
        courierId: courier.id,
        status: 'FINISHED',
        accessToken: `${MARCA}${randomUUID().slice(0, 18)}`,
        distanceMeters: Math.round(entre(3000, 14000)),
        durationSeconds: Math.round(entre(1200, 4200)),
        baselineDurationSeconds: Math.round(entre(1500, 5200)),
        createdAt: primeiro,
        startedAt: new Date(primeiro.getTime() + 5 * 60_000),
        finishedAt: ultimo,
      },
    });

    for (const [indice, p] of doDia.entries()) {
      await prisma.routeStop.create({
        data: {
          routeId: rota.id,
          orderId: p.dados.id as string,
          position: indice + 1,
          status: 'DELIVERED',
          etaSeconds: Math.round(entre(300, 1500)),
          legDistanceMeters: Math.round(entre(400, 4000)),
          resolvedAt: p.dados.deliveredAt as Date,
        },
      });
      await prisma.order.update({
        where: { id: p.dados.id as string },
        data: { routeId: rota.id },
      });
    }
    rotas += 1;
  }
}

const entregues = pedidosParaCriar.filter((p) => p.dados.status === 'DELIVERED');
const faturamento = entregues.reduce((t, p) => t + (p.dados.amountCents as number), 0);

console.log(`\n${pedidosParaCriar.length} pedidos, ${rotas} rotas`);
console.log(`entregues: ${entregues.length} · faturamento: R$ ${(faturamento / 100).toFixed(2)}`);
console.log(`cancelados: ${pedidosParaCriar.filter((p) => p.dados.status === 'CANCELLED').length}`);
console.log(`falharam: ${pedidosParaCriar.filter((p) => p.dados.status === 'FAILED').length}`);

await prisma.$disconnect();
