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
  where: {
    establishmentId: est!.id,
    source: 'IFOOD',
    OR: [{ items: { none: {} } }, { displayId: null }],
  },
  select: { id: true, externalId: true, amountCents: true, displayId: true, _count: { select: { items: true } } },
});
console.log(`${alvos.length} pedido(s) incompleto(s)\n`);

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

  // Itens so entram quando ainda nao ha nenhum: rodar de novo nao duplica.
  const gravarItens = pedido._count.items === 0 && (mapeado.items?.length ?? 0) > 0;

  await prisma.$transaction([
    ...(gravarItens
      ? [
          prisma.orderItem.createMany({
            data: mapeado.items!.map((i) => ({
              orderId: pedido.id,
              productId: null,
              name: i.name,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
              discountCents: 0,
            })),
          }),
        ]
      : []),
    prisma.order.update({
      where: { id: pedido.id },
      data: {
        displayId: mapeado.displayId ?? null,
        ...(gravarItens
          ? {
              deliveryFeeCents: mapeado.deliveryFeeCents ?? 0,
              paymentMethod: mapeado.paymentMethod ?? null,
            }
          : {}),
      },
    }),
  ]);

  console.log(
    `  ${pedido.externalId?.slice(0, 8)}  #${mapeado.displayId ?? '?'}  ${gravarItens ? `${mapeado.items!.length} item(ns) gravados` : 'itens ja existiam'}`,
  );
}
await prisma.$disconnect();
