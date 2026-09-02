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

  const corpo = (await request.json().catch(() => ({}))) as {
    message?: { text?: string; chat?: { id?: number | string } };
  };

  const texto = corpo.message?.text?.trim() ?? '';
  const chatId = corpo.message?.chat?.id;

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
