import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { env } from '../src/env';
import { IfoodAuth } from '../src/infrastructure/integrations/ifood/auth';
import { CredentialStore } from '../src/infrastructure/integrations/credential-store';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';

/**
 * Vincula uma loja do iFood a um estabelecimento do Levô.
 *
 * O modelo distribuído exige que cada lojista autorize o aplicativo, e a tela
 * para isso ainda não existe no painel. Enquanto não existe, o piloto se
 * resolve por aqui — a diferença para o script de diagnóstico é que este
 * **guarda** o resultado: sem persistir, a autorização se perde e o worker
 * continua sem conseguir buscar pedido nenhum.
 *
 *   npx tsx infra/ifood-authorize.mts
 */
const config = env();

if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) {
  console.error('Faltam IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET no .env.');
  process.exit(1);
}

const prisma = getPrismaClient(config.DATABASE_URL);
const rl = createInterface({ input: process.stdin, output: process.stdout });

const estabelecimentos = await prisma.establishment.findMany({ select: { id: true, name: true } });

if (estabelecimentos.length === 0) {
  console.error('Nenhum estabelecimento no banco. Rode o seed antes.');
  process.exit(1);
}

console.log('Estabelecimentos:');
estabelecimentos.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}  (${e.id})`));

const escolha =
  estabelecimentos.length === 1
    ? 1
    : Number(await rl.question(`\nQual deles receberá a loja do iFood? [1-${estabelecimentos.length}] `));

const estabelecimento = estabelecimentos[escolha - 1];
if (!estabelecimento) {
  console.error('Escolha inválida.');
  process.exit(1);
}

const auth = new IfoodAuth({
  clientId: config.IFOOD_CLIENT_ID,
  clientSecret: config.IFOOD_CLIENT_SECRET,
});

// ── 1. Código de vinculação ───────────────────────────────────────────────
const { userCode, authorizationCodeVerifier, verificationUrl, expiresInSeconds } =
  await auth.requestUserCode();

console.log(`\nCÓDIGO: ${userCode}`);
console.log(`válido por ${Math.round(expiresInSeconds / 60)} minutos`);
console.log(`\nAbra ${verificationUrl}, entre como o lojista, confirme a`);
console.log('vinculação e copie o código de autorização.');

const authorizationCode = (await rl.question('\nCódigo de autorização: ')).trim();

// ── 2. Troca por token ────────────────────────────────────────────────────
const tokens = await auth.exchangeAuthorizationCode({
  authorizationCode,
  authorizationCodeVerifier,
});

console.log('\nAutorização concluída. Buscando as lojas…');

// ── 3. Descobrir a loja ───────────────────────────────────────────────────
const response = await fetch('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
  headers: { authorization: `Bearer ${tokens.accessToken}` },
  signal: AbortSignal.timeout(20_000),
});

const lojas: Array<{ id: string; name?: string }> = response.ok ? await response.json() : [];

if (lojas.length === 0) {
  console.error('Nenhuma loja retornada — não dá para vincular sem merchant.');
  process.exit(1);
}

lojas.forEach((m, i) => console.log(`  ${i + 1}. ${m.name ?? '(sem nome)'}  ${m.id}`));

const escolhaLoja =
  lojas.length === 1 ? 1 : Number(await rl.question(`\nQual loja? [1-${lojas.length}] `));
const loja = lojas[escolhaLoja - 1];

if (!loja) {
  console.error('Escolha inválida.');
  process.exit(1);
}

// ── 4. Guardar ────────────────────────────────────────────────────────────
const store = new CredentialStore(prisma, config.AUTH_SECRET);

await store.save(estabelecimento.id, 'IFOOD', {
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  expiresAt: tokens.expiresAt,
  merchantId: loja.id,
});

console.log(`\nPronto: "${loja.name ?? loja.id}" vinculada a "${estabelecimento.name}".`);
console.log('Tokens gravados cifrados; a renovação passa a ser automática.');
console.log('\nSuba o worker com: npm run worker');

rl.close();
await prisma.$disconnect();
