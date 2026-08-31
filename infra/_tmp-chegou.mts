import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);
const est = await prisma.establishment.findFirst({ select: { id: true } });
const desde = new Date(Date.now() - 20 * 60_000);
const ps = await prisma.order.findMany({
  where: { establishmentId: est!.id, source: 'IFOOD', createdAt: { gte: desde } },
  select: { externalId: true, status: true, confirmedAt: true, amountCents: true, address: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});
console.log(`PEDIDOS DO IFOOD NOS ULTIMOS 20 MIN: ${ps.length}\n`);
for (const p of ps) {
  console.log(`  ${p.createdAt.toLocaleTimeString('pt-BR')}  ${p.externalId?.slice(0, 8)}  ${p.status.padEnd(10)} confirmado:${p.confirmedAt ? 'SIM' : 'nao'}  R$ ${(p.amountCents / 100).toFixed(2)}  ${p.address}`);
}
await prisma.$disconnect();
