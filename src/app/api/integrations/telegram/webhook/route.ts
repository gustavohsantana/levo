import { NextResponse } from 'next/server';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { TelegramSender } from '@/infrastructure/messaging/telegram';

export const dynamic = 'force-dynamic';

/**
 * O motoboy autorizando o bot.
 *
 * Este é o único momento em que o Telegram fala com a gente. Ele toca no link
 * `t.me/<bot>?start=<código>`, o app dele manda `/start <código>`, e aqui a
 * conversa passa a ter dono. Depois disso, avisar é só enviar.
 *
 * O endereço é público por necessidade — o Telegram precisa alcançá-lo. Quem
 * separa um evento real de alguém que descobriu a URL é o segredo no cabeçalho,
 * comparado abaixo.
 */
export async function POST(request: Request) {
  const segredo = env().TELEGRAM_WEBHOOK_SECRET;

  if (!segredo || request.headers.get('x-telegram-bot-api-secret-token') !== segredo) {
    /*
     * 401 sem detalhe: dizer "segredo errado" confirmaria para quem sonda que o
     * endereço existe e que só falta o segredo.
     */
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }

  type Mensagem = {
    text?: string;
    chat?: { id?: number | string };
    location?: { latitude: number; longitude: number };
  };

  const corpo = (await request.json().catch(() => ({}))) as {
    message?: Mensagem;
    /* Localização ao vivo chega como edição da mensagem original, não como
     * mensagem nova — é a mesma bolha se atualizando no chat. */
    edited_message?: Mensagem;
  };

  const evento = corpo.message ?? corpo.edited_message;
  const texto = evento?.text?.trim() ?? '';
  const chatId = evento?.chat?.id;

  /*
   * Posição do motoboy, do próprio Telegram.
   *
   * Vale mais que o GPS da nossa tela porque não depende dela estar aberta: o
   * celular manda com o app fechado e a tela apagada, que é onde o telefone
   * passa o turno inteiro.
   */
  if (chatId && evento?.location) {
    await registrarPosicao(String(chatId), evento.location);
    return NextResponse.json({ ok: true });
  }

  // Qualquer outra mensagem é ignorada em silêncio: este bot não conversa.
  if (!chatId || !texto.startsWith('/start')) return NextResponse.json({ ok: true });

  const token = env().TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: true });
  const bot = new TelegramSender(token);

  const codigo = texto.split(/\s+/)[1];

  /*
   * `/start` sem código não é erro do motoboy — é como o Telegram se comporta.
   *
   * O parâmetro do link só viaja no primeiro start de uma conversa nova. Quem
   * já abriu o bot antes toca no convite e manda um `/start` pelado, sem
   * código.
   *
   * Calar aqui deixa a pessoa olhando para uma tela que não respondeu, sem
   * saber se falhou ou se é assim mesmo. Dizer o que fazer custa uma mensagem.
   */
  if (!codigo) {
    await bot
      .sendText(
        String(chatId),
        [
          'Para receber suas rotas, preciso do convite que a loja gerou.',
          '',
          'Cole aqui a mensagem inteira que ela te mandou — ela começa com /start',
          'e tem um código depois.',
        ].join('\n'),
      )
      .catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  const prisma = getPrismaClient(env().DATABASE_URL);
  const courier = await prisma.courier.findUnique({
    where: { telegramInviteCode: codigo },
    select: { id: true, name: true, establishment: { select: { name: true } } },
  });

  if (!courier) {
    /*
     * Convite desconhecido responde igual a convite usado: não é papel do bot
     * dizer a um estranho se aquele código já existiu.
     */
    await bot
      .sendText(String(chatId), 'Este convite não vale mais. Peça um novo para a loja.')
      .catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  /*
   * O código morre no uso.
   *
   * Ele viaja por WhatsApp, é encaminhado, fica no histórico do grupo. Se
   * continuasse valendo, qualquer um que o encontrasse passaria a receber as
   * rotas daquele motoboy — endereço de cliente incluído.
   */
  await prisma.courier.update({
    where: { id: courier.id },
    data: { telegramChatId: String(chatId), telegramInviteCode: null },
  });

  await bot
    .sendText(
      String(chatId),
      [
        `Pronto, ${courier.name.split(/\s+/)[0]}!`,
        '',
        `Você vai receber aqui as rotas da ${courier.establishment.name}, com o link para`,
        'ver o caminho e confirmar cada entrega.',
      ].join('\n'),
    )
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}


/**
 * Guarda a posição que veio do Telegram na rota que o motoboy está fazendo.
 *
 * Sem rota ativa não há o que gravar — ele pode ter deixado o compartilhamento
 * ligado depois de terminar, e o trajeto de alguém fora de serviço não é nosso
 * assunto.
 */
async function registrarPosicao(
  chatId: string,
  local: { latitude: number; longitude: number },
): Promise<void> {
  const prisma = getPrismaClient(env().DATABASE_URL);

  const courier = await prisma.courier.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true, establishmentId: true },
  });
  if (!courier) return;

  const rota = await prisma.route.findFirst({
    where: { courierId: courier.id, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!rota) return;

  const { containerFor } = await import('@/composition-root');
  await containerFor(courier.establishmentId)
    .useCases.recordPing.execute(rota.id, {
      lat: local.latitude,
      lng: local.longitude,
    })
    /*
     * Falha aqui não pode virar erro para o Telegram: ele reenviaria a mesma
     * posição, que a essa altura já está velha, e a próxima chega em segundos.
     */
    .catch(() => undefined);
}
