import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
import { CredentialStore } from '../src/infrastructure/integrations/credential-store';
import { IfoodAuth } from '../src/infrastructure/integrations/ifood/auth';

const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);
const store = new CredentialStore(prisma, c.AUTH_SECRET);
const est = await prisma.establishment.findFirst({ select: { id: true } });
const auth = new IfoodAuth({ clientId: c.IFOOD_CLIENT_ID!, clientSecret: c.IFOOD_CLIENT_SECRET! });
const token = await store.accessTokenFor(est!.id, 'IFOOD', (rt) => auth.refresh(rt));
const ALVO = 'f0309c75-8158-4a73-a4bf-2b518464cd59';

const p = await prisma.order.findFirst({
  where: { establishmentId: est!.id, externalId: ALVO },
  select: { displayId: true, status: true, confirmedAt: true, readyAt: true, deliveredAt: true,
            amountCents: true, deliveryFeeCents: true, paymentMethod: true, address: true,
            items: { select: { name: true, quantity: true, unitPriceCents: true } } },
});
console.log('=== NO LEVO ===');
console.log(`  #${p!.displayId}  status: ${p!.status}`);
console.log(`  aceito: ${p!.confirmedAt?.toLocaleTimeString('pt-BR') ?? '—'}   pronto: ${p!.readyAt?.toLocaleTimeString('pt-BR') ?? '—'}   entregue: ${p!.deliveredAt?.toLocaleTimeString('pt-BR') ?? '—'}`);
console.log(`  ${p!.address}`);
for (const i of p!.items) console.log(`    ${i.quantity}x R$ ${(i.unitPriceCents/100).toFixed(2)}  ${i.name.slice(0,70)}`);
console.log(`  taxa R$ ${(p!.deliveryFeeCents/100).toFixed(2)}  total R$ ${(p!.amountCents/100).toFixed(2)}  pagamento ${p!.paymentMethod}`);

console.log('\n=== NO IFOOD ===');
const r = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${ALVO}`, { headers: { Authorization: `Bearer ${token}` } });
const o = await r.json() as Record<string, unknown>;
for (const k of ['displayId','isTest','orderTiming','orderType','salesChannel','createdAt','preparationStartDateTime']) console.log(`  ${k}: ${JSON.stringify(o[k])}`);
console.log(`  delivery.deliveredBy: ${JSON.stringify((o.delivery as Record<string,unknown>)?.deliveredBy)}`);
console.log(`  campos disponiveis: ${Object.keys(o).join(', ')}`);
await prisma.$disconnect();
