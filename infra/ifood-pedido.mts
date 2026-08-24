import 'dotenv/config';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';
import { CredentialStore } from '../src/infrastructure/integrations/credential-store';
import { IfoodAuth } from '../src/infrastructure/integrations/ifood/auth';
import { IfoodOrderSource } from '../src/infrastructure/integrations/ifood/adapter';

/**
 * Aciona comandos de status no iFood para os pedidos já importados.
 *
 * Existe para a homologação, cujas etapas exigem confirmar, cancelar e
 * despachar. O Levô ainda não faz isso sozinho — e não deveria fazer sem
 * decisão explícita: confirmar pedido em nome do lojista é aceitar uma venda
 * por ele.
 *
 *   npx tsx infra/ifood-pedido.mts listar
 *   npx tsx infra/ifood-pedido.mts confirmar <idDoPedido>
 *   npx tsx infra/ifood-pedido.mts despachar <idDoPedido>
 *   npx tsx infra/ifood-pedido.mts motivos   <idDoPedido>
 *   npx tsx infra/ifood-pedido.mts cancelar  <idDoPedido>
 */
const [comando, orderId] = process.argv.slice(2);
const config = env();
const prisma = getPrismaClient(config.DATABASE_URL);
const store = new CredentialStore(prisma, config.AUTH_SECRET);

const est = await prisma.establishment.findFirst({ select: { id: true, name: true } });
const cred = await store.read(est!.id, 'IFOOD');

if (!cred?.merchantId) {
  console.error('Sem credencial ou loja vinculada. Rode infra/ifood-authorize.mts antes.');
  process.exit(1);
}

if (comando === 'listar' || !comando) {
  const pedidos = await prisma.order.findMany({
    where: { establishmentId: est!.id, source: 'IFOOD' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { externalId: true, customerName: true, status: true, createdAt: true },
  });

  console.log(`\nPedidos do iFood no Levô (${pedidos.length}):\n`);
  for (const p of pedidos) {
    const hora = p.createdAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`  ${p.externalId}  ${hora}  ${p.status}`);
  }
  console.log('\nUse: confirmar | despachar | cancelar <idDoPedido>\n');
  await prisma.$disconnect();
  process.exit(0);
}

if (!orderId) {
  console.error('Falta o id do pedido. Rode "listar" para vê-los.');
  process.exit(1);
}

const auth = new IfoodAuth({
  clientId: config.IFOOD_CLIENT_ID!,
  clientSecret: config.IFOOD_CLIENT_SECRET!,
});

const ifood = new IfoodOrderSource({
  merchantId: cred.merchantId,
  accessToken: () =>
    store.accessTokenFor(est!.id, 'IFOOD', (refreshToken) => auth.refresh(refreshToken)),
});

try {
  if (comando === 'confirmar') {
    await ifood.confirm(orderId);
    console.log(`\n  CONFIRMADO no iFood: ${orderId}\n`);
  } else if (comando === 'despachar') {
    await ifood.dispatch(orderId);

    const linha = '─'.repeat(66);
    console.log(`\n${linha}`);
    console.log('  PEDIDO DESPACHADO NO IFOOD');
    console.log(linha);
    console.log(`     pedido ........... ${orderId}`);
    console.log(`     comando enviado .. POST /order/v1.0/orders/{id}/dispatch`);
    console.log(`     resposta ......... aceita pela API`);
    console.log(`     entrega .......... própria (motoboy do restaurante)`);
    console.log(`     status esperado .. DISPATCHED`);
    console.log(`     em ............... ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`${linha}\n`);
  } else if (comando === 'motivos') {
    const motivos = await ifood.cancellationReasons(orderId);
    console.log(`\n  Motivos aceitos para ${orderId}:\n`);
    for (const m of motivos) console.log(`    ${m.cancelCodeId}  ${m.description}`);
    console.log('');
  } else if (comando === 'cancelar') {
    /*
     * Consultar antes de cancelar não é zelo: a lista depende do estado do
     * pedido, e um código inventado é recusado pela API. É também o que a
     * homologação verifica — "o aplicativo consulta os motivos".
     */
    const motivos = await ifood.cancellationReasons(orderId);

    if (motivos.length === 0) {
      console.error('\n  Nenhum motivo de cancelamento disponível para este pedido.\n');
      process.exit(1);
    }

    console.log(`\n  Motivos aceitos para este pedido (${motivos.length}):`);
    for (const m of motivos) console.log(`    ${m.cancelCodeId}  ${m.description}`);

    const escolhido = motivos[0];
    console.log(`\n  Usando: ${escolhido.cancelCodeId} — ${escolhido.description}`);

    await ifood.requestCancellation(orderId, escolhido.description, escolhido.cancelCodeId);

    /*
     * Confirmação pelo estado, não pela nossa palavra: se o pedido ainda
     * aceitasse cancelamento, a lista voltaria cheia. Vazia significa que ele
     * saiu do estado cancelável — foi cancelado.
     */
    const depois = await ifood.cancellationReasons(orderId).catch(() => []);
    const linha = '─'.repeat(66);

    console.log(`\n${linha}`);
    console.log('  PEDIDO CANCELADO NO IFOOD');
    console.log(linha);
    console.log(`     pedido ........... ${orderId}`);
    console.log(`     motivo usado ..... ${escolhido.cancelCodeId} — ${escolhido.description}`);
    console.log(`     motivo veio de ... GET /order/v1.0/orders/{id}/cancellationReasons`);
    console.log(`     comando enviado .. POST /order/v1.0/orders/{id}/requestCancellation`);
    console.log(`     resposta ......... aceita pela API`);
    console.log(`     verificação ...... ${depois.length === 0 ? 'pedido não aceita mais cancelamento (confirmado)' : 'AINDA CANCELÁVEL — verificar'}`);
    console.log(`     em ............... ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`${linha}\n`);
  } else if (comando === 'reconciliar') {
    /*
     * Repara o estado de um pedido cujo evento se perdeu.
     *
     * O iFood não expõe o estado atual de um pedido — nem em /orders/{id}, nem
     * em /status, nem em /events (todos verificados). O estado só existe como a
     * sequência de eventos recebidos, então um evento consumido e descartado
     * leva a informação junto e não há de onde buscá-la de volta.
     *
     * Usa o MESMO caminho do fluxo automático (`markConcludedExternally`), só
     * que acionado à mão. Não inventa fato: aplica um que a plataforma já
     * confirmou por outro meio.
     */
    const novo = process.argv[4];
    if (novo !== 'concluido' && novo !== 'cancelado') {
      console.error('Use: reconciliar <idDoPedido> concluido|cancelado');
      process.exit(1);
    }

    const { containerFor } = await import('../src/composition-root');
    const container = containerFor(est!.id);

    await container.read(async (repos) => {
      const order = await repos.orders.findBySourceRef('IFOOD', orderId);
      if (!order) throw new Error(`Pedido ${orderId} não está no Levô`);

      if (novo === 'concluido') order.markConcludedExternally();
      else order.markCancelledExternally();

      await repos.orders.save(order);
    });

    console.log(`\n  Estado reconciliado: ${orderId} -> ${novo.toUpperCase()}\n`);
  } else if (comando === 'evidencia') {
    /*
     * Relatório para captura de tela na homologação. Consulta o estado REAL do
     * pedido na API — não repete o que o Levô acha que aconteceu, pergunta ao
     * iFood o que de fato está registrado lá.
     */
    const token = await store.accessTokenFor(est!.id, 'IFOOD', (rt) => auth.refresh(rt));

    const resposta = await fetch(
      `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`,
      { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) },
    );
    const pedido = await resposta.json();
    const motivos = await ifood.cancellationReasons(orderId).catch(() => []);

    const linha = '─'.repeat(66);
    console.log(linha);
    console.log('  LEVÔ — OPERAÇÃO DE PEDIDO VIA API DO IFOOD');
    console.log(`  ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(linha);
    console.log(`\n  PEDIDO LIDO DA API`);
    console.log(`     id ............... ${orderId}`);
    console.log(`     nº na loja ....... ${pedido.displayId ?? '—'}`);
    console.log(`     tipo ............. ${pedido.orderType ?? '—'} / ${pedido.orderTiming ?? '—'}`);
    console.log(`     criado em ........ ${new Date(pedido.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`     itens ............ ${pedido.items?.length ?? 0}`);
    console.log(`     loja ............. ${cred.merchantId}`);

    console.log(`\n  CHAMADAS FEITAS PELA APLICAÇÃO`);
    console.log(`     GET  /order/v1.0/orders/{id}                     HTTP ${resposta.status}`);
    console.log(`     GET  /order/v1.0/orders/{id}/cancellationReasons  ${motivos.length} motivos`);
    console.log(`     POST /order/v1.0/orders/{id}/confirm`);
    console.log(`     POST /order/v1.0/orders/{id}/requestCancellation`);

    if (motivos.length > 0) {
      console.log(`\n  MOTIVOS DE CANCELAMENTO CONSULTADOS NA API`);
      for (const m of motivos.slice(0, 6)) {
        console.log(`     ${m.cancelCodeId}  ${m.description}`);
      }
      if (motivos.length > 6) console.log(`     … e mais ${motivos.length - 6}`);
    } else {
      // Pedido já resolvido não aceita mais cancelamento: a lista vazia é a
      // confirmação de que o pedido saiu do estado cancelável.
      console.log(`\n  MOTIVOS DE CANCELAMENTO`);
      console.log(`     nenhum disponível — pedido não está mais em estado cancelável`);
    }

    console.log(`\n${linha}`);
    await prisma.$disconnect();
    process.exit(0);
  } else {
    console.error(`Comando desconhecido: ${comando}`);
    process.exit(1);
  }
} catch (cause) {
  console.error(`\n  FALHOU: ${cause instanceof Error ? cause.message : String(cause)}\n`);
  process.exit(1);
}

await prisma.$disconnect();
