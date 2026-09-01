import 'dotenv/config';
import { getPrismaClient } from './src/infrastructure/persistence/prisma/client';
import { env } from './src/env';
import { CredentialStore } from './src/infrastructure/integrations/credential-store';
import { mercadoPagoAccessTokenFor } from './src/infrastructure/payments/mercadopago/factory';
const EST = '11111111-1111-1111-1111-111111111111';
const PEDIDO = '60471eb7-0ced-4474-81cd-e59d633980aa';
const COBRANCA = '176733547748';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const cfg = env();
  const p = getPrismaClient(cfg.DATABASE_URL);
  const store = new CredentialStore(p, cfg.AUTH_SECRET);
  const token = await mercadoPagoAccessTokenFor(store, EST)();

  for (let i = 0; i < 60; i++) {
    const mp = await (await fetch(`https://api.mercadopago.com/v1/payments/${COBRANCA}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json() as any;

    const pg = await p.payment.findFirst({
      where: { establishmentId: EST, orderId: PEDIDO },
      select: { status: true, paidAt: true },
    });
    const pedido = await p.order.findFirst({
      where: { establishmentId: EST, id: PEDIDO },
      select: { status: true, paymentStatus: true },
    });

    const linha = `${new Date().toISOString().slice(11, 19)}  MP=${mp.status}/${mp.status_detail}`
      + `  banco=${pg?.status}  pedido=${pedido?.status}/${pedido?.paymentStatus}`;
    console.log(linha);

    if (mp.status === 'approved' || pg?.status === 'PAID') {
      console.log('>>> PAGAMENTO ENTROU');
      if (pedido?.paymentStatus === 'PAID') console.log('>>> PEDIDO MARCADO COMO PAGO');
      await sleep(15_000);
      const fim = await p.order.findFirst({
        where: { establishmentId: EST, id: PEDIDO },
        select: { status: true, paymentStatus: true },
      });
      console.log('>>> estado final do pedido:', fim?.status, fim?.paymentStatus);
      break;
    }
    if (mp.status === 'cancelled') { console.log('>>> COBRANCA MORREU SEM PAGAMENTO'); break; }
    await sleep(10_000);
  }
  await p.$disconnect();
}
void main();
