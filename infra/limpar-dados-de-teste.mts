/**
 * Apaga os dados de teste do piloto, deixando o painel limpo.
 *
 * O que SOBREVIVE, porque nao e teste: entregadores, produtos, credenciais de
 * integracao, faixas de taxa — e o pedido do unico pagamento aprovado, que e a
 * prova de que o Pix funcionou de ponta a ponta.
 *
 * Roda numa transacao: ou limpa tudo, ou nao mexe em nada. As rotas sao soltas
 * dos pedidos antes de serem apagadas, porque o pedido preservado aponta para
 * uma delas.
 *
 * Uso:  npx tsx infra/limpar-dados-de-teste.mts
 */
import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';

const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);
const est = await prisma.establishment.findFirst({ select: { id: true, name: true } });
if (!est) throw new Error('nenhum estabelecimento');

const pago = await prisma.payment.findFirst({
  where: { establishmentId: est.id, status: 'PAID' },
  select: { orderId: true, amountCents: true },
});
const preservar = pago?.orderId ?? '__nenhum__';

console.log(`${est.name}`);
console.log(
  pago
    ? `preservando o pedido do Pix aprovado (R$ ${(pago.amountCents / 100).toFixed(2)})\n`
    : 'nenhum pagamento aprovado para preservar\n',
);

const r = await prisma.$transaction(
  async (tx) => {
    await tx.order.updateMany({ where: { establishmentId: est.id }, data: { routeId: null } });
    const stops = await tx.routeStop.deleteMany({ where: { route: { establishmentId: est.id } } });
    const rotas = await tx.route.deleteMany({ where: { establishmentId: est.id } });
    const avisos = await tx.marketplaceCommand.deleteMany({ where: { establishmentId: est.id } });
    const pags = await tx.payment.deleteMany({
      where: { establishmentId: est.id, status: { not: 'PAID' } },
    });
    const pedidos = await tx.order.deleteMany({
      where: { establishmentId: est.id, id: { not: preservar } },
    });
    return { stops, rotas, avisos, pags, pedidos };
  },
  { timeout: 60_000 },
);

console.log('APAGADO:');
console.log(`  paradas ..... ${r.stops.count}`);
console.log(`  rotas ....... ${r.rotas.count}`);
console.log(`  avisos ...... ${r.avisos.count}`);
console.log(`  pagamentos .. ${r.pags.count}`);
console.log(`  pedidos ..... ${r.pedidos.count}`);

console.log('\nSOBROU:');
console.log(`  pedidos ......... ${await prisma.order.count({ where: { establishmentId: est.id } })}`);
console.log(`  rotas ........... ${await prisma.route.count({ where: { establishmentId: est.id } })}`);
console.log(`  entregadores .... ${await prisma.courier.count({ where: { establishmentId: est.id } })}`);
console.log(`  produtos ........ ${await prisma.product.count({ where: { establishmentId: est.id } })}`);
for (const cr of await prisma.integrationCredential.findMany({
  where: { establishmentId: est.id },
  select: { provider: true },
})) {
  console.log(`  credencial ...... ${cr.provider}`);
}

await prisma.$disconnect();
