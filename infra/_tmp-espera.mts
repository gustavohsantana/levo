import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);
const est = await prisma.establishment.findFirst({ select: { id: true } });
const ALVO = 'f0309c75-8158-4a73-a4bf-2b518464cd59';
const ate = Date.now() + 45 * 60_000;
while (Date.now() < ate) {
  const p = await prisma.order.findFirst({
    where: { establishmentId: est!.id, externalId: ALVO },
    select: { displayId: true, status: true, deliveredAt: true },
  });
  if (p && p.status !== 'NEW') {
    console.log(`\nMUDOU: #${p.displayId} agora e ${p.status}` + (p.deliveredAt ? ` (${p.deliveredAt.toLocaleTimeString('pt-BR')})` : ''));
    break;
  }
  await new Promise((r) => setTimeout(r, 20000));
}
await prisma.$disconnect();
