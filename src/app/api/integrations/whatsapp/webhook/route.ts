import { NextResponse } from 'next/server';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import {
  assinaturaConfere,
  mensagensDoEvento,
  statusesDoEvento,
  verificarInscricao,
  type MensagemRecebida,
} from '@/infrastructure/integrations/whatsapp/webhook-protocol';
import { WhatsappEnvio } from '@/infrastructure/integrations/whatsapp/envio';
import { resolverLoja } from '@/infrastructure/integrations/whatsapp/resolver-loja';
import { atender } from '@/infrastructure/integrations/whatsapp/conversa/atendimento';
import {
  fontesDaLoja,
  gravarConversa,
  lerConversa,
  montarRetrato,
  pedidosEmAndamento,
} from '@/infrastructure/integrations/whatsapp/conversa/repositorio';
import { lerEstado } from '@/infrastructure/integrations/whatsapp/conversa/estado';
import { atendenteDaLoja } from '@/infrastructure/integrations/whatsapp/conversa/atendente';
import type { MensagemDeSaida } from '@/infrastructure/integrations/whatsapp/conversa/mensagem-de-saida';

/**
 * Entrada de eventos do WhatsApp (Cloud API da Meta).
 *
 * As regras abaixo são da especificação de Webhooks da Meta, não escolha nossa:
 *
 * 1. **`GET` é o aperto de mão.** A Meta chama com um desafio e só assina a
 *    inscrição se a resposta for o desafio **em texto puro**. Enquanto isso não
 *    passar, nenhum evento chega — e não há aviso dizendo que é por isso.
 *
 * 2. **`POST` responde 200.** Qualquer outra coisa faz a Meta reenviar
 *    imediatamente e depois com frequência decrescente por **36 horas**.
 *
 * 3. **Evento repetido acontece, e a ordem não é garantida.** A própria
 *    documentação avisa dos dois. Por isso o `wamid` é a chave de idempotência,
 *    e o horário que vale é o `timestamp` da mensagem, nunca o de chegada.
 *
 * 4. **Um POST traz várias mensagens** — a Meta agrupa até 1000 atualizações
 *    por lote. Ler só a primeira perderia pedido em horário de pico.
 *
 * Como no 99Food, aqui só se anota. Montar resposta de bot dentro do webhook
 * colocaria a latência de um modelo de linguagem dentro do prazo da Meta.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ---------------------------------------------------------------- */
/* O aperto de mão                                                   */
/* ---------------------------------------------------------------- */

export async function GET(request: Request) {
  if (!env().whatsappEnabled) {
    console.warn('[whatsapp] verificação recusada: canal pausado');
    return new Response('pausado', { status: 403 });
  }

  const verifyToken = env().WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.warn('[whatsapp] verificação chamada sem WHATSAPP_VERIFY_TOKEN configurado');
    return new Response('não configurado', { status: 403 });
  }

  const resultado = verificarInscricao(
    new URL(request.url).searchParams,
    verifyToken,
  );

  if (!resultado.ok) {
    console.warn('[whatsapp] verificação recusada', { motivo: resultado.motivo });
    return new Response('forbidden', { status: 403 });
  }

  /*
   * Texto puro, e só o desafio.
   *
   * A Meta compara a resposta byte a byte. `NextResponse.json` colocaria aspas
   * em volta e o content-type de JSON, e a inscrição seria recusada sem
   * explicação — o erro mais comum desta integração.
   */
  return new Response(resultado.desafio, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

/* ---------------------------------------------------------------- */
/* Os eventos                                                        */
/* ---------------------------------------------------------------- */

export async function POST(request: Request) {
  if (!env().whatsappEnabled) {
    console.info('[whatsapp] evento ignorado: canal pausado');
    return NextResponse.json({ ok: true, pausado: true }, { status: 200 });
  }

  const appSecret = env().WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn('[whatsapp] evento recebido sem WHATSAPP_APP_SECRET configurado');
    // 200 de propósito: sem segredo não há o que validar, e pedir reenvio por
    // 36 horas de algo que não vamos conseguir processar só enche o log.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  /*
   * O corpo CRU, antes de qualquer parse. A assinatura cobre os bytes exatos
   * que a Meta enviou; reserializar depois de um parse muda espaço e ordem de
   * chave, e ela passa a falhar sempre.
   */
  const raw = await request.text();

  if (!assinaturaConfere(raw, request.headers.get('x-hub-signature-256'), appSecret)) {
    /*
     * 403, e não 200.
     *
     * Requisição forjada nunca esteve na fila de reenvio da Meta, então não há
     * retry para provocar. O caso que um "ok" aqui esconderia é o pior: segredo
     * trocado do nosso lado, engolindo mensagem de cliente de verdade em
     * silêncio. Recusando, a falha aparece nos dois lados.
     */
    console.warn('[whatsapp] assinatura inválida', { tamanho: raw.length });
    return new Response('forbidden', { status: 403 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(raw);
  } catch (cause) {
    console.error('[whatsapp] corpo ilegível', { cause: String(cause) });
    // Corpo quebrado não melhora com reenvio.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  /*
   * Os recibos primeiro, e sempre no log.
   *
   * `failed` traz o único lugar onde a Meta explica por que a mensagem não
   * chegou — e ela não repete essa informação em lugar nenhum. Sem isto, o
   * sintoma é "mandei e não chegou", sem causa.
   */
  for (const st of statusesDoEvento(corpo)) {
    const linha = { wamid: st.id, para: st.para, status: st.status, erro: st.erro };
    if (st.status === 'failed') console.error('[whatsapp] envio FALHOU', linha);
    else console.info('[whatsapp] status', linha);
  }

  const mensagens = mensagensDoEvento(corpo);

  /*
   * Lote sem mensagem é rotina, não erro: a mesma inscrição entrega recibo de
   * entrega, mudança de status e atualização de template.
   */
  if (mensagens.length === 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const prisma = getPrismaClient(env().DATABASE_URL);

    for (const msg of mensagens) {
      /*
       * O `wamid` é a chave de idempotência. A documentação da Meta diz que
       * evento repetido pode acontecer — sem isto, o cliente que mandou uma
       * mensagem teria duas conversas com o bot.
       */
      await prisma.integrationEvent.upsert({
        where: {
          provider_externalEventId: { provider: 'WHATSAPP', externalEventId: msg.id },
        },
        create: {
          provider: 'WHATSAPP',
          externalEventId: msg.id,
          code: msg.tipo,
          /*
           * Ainda não existe pedido. O que identifica a conversa é o telefone
           * do cliente, e é ele que o ciclo de processamento usa para resolver
           * a loja e continuar de onde parou.
           */
          externalOrderId: msg.de,
          // O número do Levô (ou da loja) que recebeu — a outra metade da
          // resolução, e o que permite vários números conviverem.
          merchantId: msg.paraNumeroId,
          payload: {
            de: msg.de,
            nome: msg.nome,
            tipo: msg.tipo,
            texto: msg.texto,
            // ISO, não o objeto: o horário que vale é o da mensagem, porque a
            // Meta não garante a ordem de entrega.
            em: msg.em.toISOString(),
            paraNumeroId: msg.paraNumeroId,
          },
        },
        // Reentrega não reescreve nada: o que chegou primeiro é o original.
        update: {},
      });
    }

    /*
     * ⭐ A costura onde o bot vai entrar.
     *
     * Hoje isto responde uma frase fixa, e é DE PROPÓSITO provisório: serve
     * para provar o circuito de ponta a ponta com o cliente do outro lado.
     *
     * A conversa de verdade — cardápio, itens, endereço, confirmação — não vai
     * morar aqui. A Meta dá 5 segundos para esta requisição e reenvia se
     * estourar; um modelo de linguagem pensando no meio disso viraria evento
     * duplicado. O lugar dela é o ciclo de processamento, lendo os eventos que
     * acabaram de ser gravados.
     *
     * O que fica daqui é só o aviso de recebimento imediato: silêncio depois de
     * "oi" faz o cliente achar que ninguém viu e ligar no telefone.
     */
    await responder(mensagens).catch((cause) =>
      console.error('[whatsapp] resposta automática falhou', { cause: String(cause) }),
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (cause) {
    /*
     * Falha nossa (banco fora) merece reenvio — a Meta insiste por 36 horas, e
     * é exatamente disso que precisamos aqui.
     */
    console.error('[whatsapp] falha ao registrar evento', { cause: String(cause) });
    return new Response('erro ao registrar', { status: 500 });
  }
}

/**
 * Conduz a conversa e responde.
 *
 * Roda DENTRO da requisição do webhook, e isso é escolha: a Meta dá 5 segundos,
 * e um passo de conversa (ler estado, consultar cardápio, montar resposta) cabe
 * com folga. Jogar para um ciclo de 30s daria um bot que responde meio minuto
 * depois — ninguém espera isso num chat.
 *
 * O que torna seguro é a idempotência por `wamid` logo acima: reentrega da Meta
 * não chega até aqui, então nunca há resposta dobrada.
 *
 * Falhar aqui NUNCA pode derrubar o webhook — a mensagem já está gravada, e
 * devolver erro faria a Meta reenviar um evento já processado.
 */
async function responder(mensagens: MensagemRecebida[]): Promise<void> {
  const config = env();
  if (!config.whatsappEnabled) return;
  if (!config.WHATSAPP_ACCESS_TOKEN || !config.WHATSAPP_PHONE_NUMBER_ID) return;

  const prisma = getPrismaClient(config.DATABASE_URL);
  const envio = new WhatsappEnvio({
    phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: config.WHATSAPP_ACCESS_TOKEN,
    graphVersion: config.WHATSAPP_GRAPH_VERSION,
  });

  /*
   * Uma resposta por CONVERSA, não por mensagem. Cliente ansioso manda três
   * linhas seguidas e a Meta entrega as três no mesmo lote — responder cada uma
   * despejaria três mensagens iguais no celular dele.
   */
  const jaRespondidos = new Set<string>();

  for (const msg of mensagens) {
    if (jaRespondidos.has(msg.de)) continue;
    jaRespondidos.add(msg.de);

    // Os dois tiques azuis antes de pensar: o cliente vê que foi lido.
    await envio.marcarComoLida(msg.id);

    const fontes = fontesDaLoja(prisma);
    const canal = await fontes.canalPorNumero(msg.paraNumeroId);
    if (!canal || !canal.active) {
      console.warn('[whatsapp] número sem canal ativo', { numero: msg.paraNumeroId });
      continue;
    }

    const resolucao = await resolverLoja(msg, fontes);
    const retrato = await montarRetrato(prisma, resolucao, new Date());

    const lojas = Object.keys(retrato.nomeDaLoja);
    retrato.pedidosEmAndamento = await pedidosEmAndamento(prisma, msg.de, lojas);

    const gravado = await lerConversa(prisma, canal.id, msg.de);
    const anterior = lerEstado(gravado);

    const atendimento = await atender(msg, {
      estadoGravado: gravado,
      retrato,
      agente: await atendenteDaLoja(prisma, atualOuFoco(resolucao, anterior.lojaEmFoco)),
      /*
       * Sem logger, falha do agente some — e o sintoma que sobra é o bot
       * repetindo a mesma frase, que não aponta para causa nenhuma. Foi
       * exatamente o que aconteceu no primeiro dia em produção.
       */
      logger: consoleComoLogger,
    }, anterior.dialogo ?? []);

    for (const resposta of atendimento.respostas) {
      await enviarResposta(envio, msg.de, resposta);
    }

    const loja = atendimento.estado.lojaEmFoco;
    if (loja) {
      await gravarConversa(prisma, canal.id, msg.de, loja, {
        ...atendimento.estado,
        dialogo: atendimento.dialogoDoAgente,
      });
    }

    if (atendimento.custo.entrada > 0) {
      // Medir por conversa é o que permite comparar com a estimativa e
      // descobrir cedo se o custo por pedido saiu do lugar.
      console.info('[whatsapp] agente', {
        de: msg.de,
        loja,
        ...atendimento.custo,
      });
    }
  }
}

/** A loja da resolução, ou a que já estava em foco. */
function atualOuFoco(
  resolucao: Awaited<ReturnType<typeof resolverLoja>>,
  emFoco: string | null,
): string | null {
  return resolucao.tipo === 'loja' ? resolucao.establishmentId : emFoco;
}

/**
 * Manda a mensagem no formato que o WhatsApp desenha.
 *
 * Texto numerado no lugar de botão foi o que o cliente chamou de "formatação
 * zoada" na conversa real. O motor já devolve `botoes`/`lista`; daqui pra
 * frente isso sai como controle de verdade, não como parágrafo.
 */
function enviarResposta(
  envio: WhatsappEnvio,
  para: string,
  m: MensagemDeSaida,
): Promise<{ id: string; para: string }> {
  if (m.tipo === 'texto') return envio.texto(para, m.corpo);
  if (m.tipo === 'botoes') return envio.botoes(para, m.corpo, m.opcoes);
  return envio.lista(para, m.corpo, m.rotuloDoBotao, m.opcoes);
}

/**
 * O `console` no formato que as camadas de dentro esperam.
 *
 * Na Vercel o `console` já vai para o log estruturado, então não há ganho em
 * montar um logger de verdade aqui — o que faltava era simplesmente PASSAR
 * algum.
 */
const consoleComoLogger = {
  debug: (o: object, m: string) => console.debug(m, o),
  info: (o: object, m: string) => console.info(m, o),
  warn: (o: object, m: string) => console.warn(m, o),
  error: (o: object, m: string) => console.error(m, o),
} as never;
