import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
import { CredentialStore } from '../src/infrastructure/integrations/credential-store';
import { IfoodAuth } from '../src/infrastructure/integrations/ifood/auth';
import { mapIfoodOrder } from '../src/infrastructure/integrations/ifood/adapter';

/**
 * Preenche itens, taxa e forma de pagamento em pedidos do iFood importados
 * antes de o adapter aprender a ler essas informacoes.
 *
 * Nao inventa nada: busca o pedido na API do iFood e grava o que ele diz.
 * Idempotente — pedido que ja tem item e pulado.
 */
const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);
const store = new CredentialStore(prisma, c.AUTH_SECRET);
const est = await prisma.establishment.findFirst({ select: { id: true } });
const cred = await store.read(est!.id, 'IFOOD');
const auth = new IfoodAuth({ clientId: c.IFOOD_CLIENT_ID!, clientSecret: c.IFOOD_CLIENT_SECRET! });
const token = await store.accessTokenFor(est!.id, 'IFOOD', (rt) => auth.refresh(rt));

const alvos = await prisma.order.findMany({
  where: { establishmentId: est!.id, source: 'IFOOD', items: { none: {} } },
  select: { id: true, externalId: true, amountCents: true },
});
console.log(`${alvos.length} pedido(s) sem itens\n`);

for (const pedido of alvos) {
  const r = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${pedido.externalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    console.log(`  ${pedido.externalId?.slice(0, 8)}  HTTP ${r.status} — pulado`);
    continue;
  }

  const bruto = await r.json();
  const mapeado = mapIfoodOrder(bruto, pedido.externalId!, bruto.createdAt);
  if (!mapeado.items?.length) {
    console.log(`  ${pedido.externalId?.slice(0, 8)}  sem itens no iFood — pulado`);
    continue;
  }

  await prisma.$transaction([
    prisma.orderItem.createMany({
      data: mapeado.items.map((i) => ({
        orderId: pedido.id,
        productId: null,
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        discountCents: 0,
      })),
    }),
    prisma.order.update({
      where: { id: pedido.id },
      data: {
        deliveryFeeCents: mapeado.deliveryFeeCents ?? 0,
        paymentMethod: mapeado.paymentMethod ?? null,
      },
    }),
  ]);

  console.log(
    `  ${pedido.externalId?.slice(0, 8)}  ${mapeado.items.length} item(ns), taxa R$ ${((mapeado.deliveryFeeCents ?? 0) / 100).toFixed(2)}, ${mapeado.paymentMethod}`,
  );
}
await prisma.$disconnect();
