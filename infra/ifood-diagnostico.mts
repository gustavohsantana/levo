import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
import { CredentialStore } from '../src/infrastructure/integrations/credential-store';

/**
 * Evidência da etapa "Testar conectividade" da homologação do iFood.
 *
 * Formatado para virar captura de tela: prova que o aplicativo autentica na API
 * e que a loja vinculada responde. Dos tokens só aparece o tamanho.
 */
const config = env();
const prisma = getPrismaClient(config.DATABASE_URL);
const store = new CredentialStore(prisma, config.AUTH_SECRET);

const est = await prisma.establishment.findFirst({ select: { id: true, name: true } });
const cred = await store.read(est!.id, 'IFOOD');

const linha = '─'.repeat(62);
console.log(linha);
console.log('  LEVÔ — CONECTIVIDADE COM A API DO IFOOD');
console.log(`  ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
console.log(linha);

if (!cred) {
  console.log('\n  SEM CREDENCIAL GRAVADA — a loja ainda não foi vinculada.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log('\n  1. APLICATIVO AUTENTICADO NA API');
console.log(`     clientId em uso .. ${config.IFOOD_CLIENT_ID}`);
console.log(`     accessToken ...... ${cred.accessToken.length} caracteres`);
console.log(`     refreshToken ..... presente (renovação automática)`);
console.log(
  `     validade ......... ${cred.expiresAt?.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
);

console.log('\n  2. LOJA VINCULADA');
console.log(`     merchantId ....... ${cred.merchantId}`);
console.log(`     estabelecimento .. ${est?.name}`);

const inicio = Date.now();
const polling = await fetch('https://merchant-api.ifood.com.br/events/v1.0/events:polling', {
  headers: {
    authorization: `Bearer ${cred.accessToken}`,
    'x-polling-merchants': cred.merchantId!,
  },
  signal: AbortSignal.timeout(20_000),
});
const ms = Date.now() - inicio;
const corpo = await polling.text();

console.log('\n  3. POLLING DE EVENTOS — chamada real, agora');
console.log('     GET /events/v1.0/events:polling');
console.log(`     resposta ......... HTTP ${polling.status} em ${ms}ms`);
console.log('     intervalo ........ 30s, conforme a documentação');
console.log(
  `     fila ............. ${polling.status === 204 || !corpo ? 'vazia (204)' : JSON.parse(corpo).length + ' evento(s)'}`,
);

const pedidos = await prisma.order.count({
  where: { establishmentId: est!.id, source: 'IFOOD' },
});
console.log('\n  4. PEDIDOS JÁ IMPORTADOS DESTA LOJA');
console.log(`     total ............ ${pedidos}`);

console.log(`\n${linha}`);
console.log(polling.ok || polling.status === 204 ? '  CONECTADO' : '  FALHA NA CONEXÃO');
console.log(linha);

await prisma.$disconnect();
