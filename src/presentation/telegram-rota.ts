import { env } from '@/env';

/**
 * O aviso que o motoboy recebe quando a rota sai.
 *
 * O bot já prometia isto a ele por escrito no momento do convite — "você vai
 * receber aqui as rotas da loja" — e a mensagem nunca chegava, porque ninguém
 * enviava. Do lado dele isso não parece funcionalidade faltando; parece produto
 * quebrado.
 *
 * O canal existe porque o Telegram não deixa bot iniciar conversa: o motoboy
 * tocou no convite uma vez, e é esse consentimento que autoriza tudo daqui para
 * frente. Não há como isto virar mensagem indesejada.
 */

/** Acima disto a mensagem vira parede de texto e ninguém lê a primeira parada. */
const PARADAS_NA_MENSAGEM = 10;

export interface ParadaDoAviso {
  cliente: string;
  endereco: string;
}

/**
 * O texto puro, sem nada de rede — é o que os testes olham.
 *
 * Sem markdown de propósito: nome de cliente e endereço são texto de terceiro,
 * e `_` ou `*` num deles quebraria a formatação da mensagem inteira no Telegram.
 * Escapar cada campo seria uma regra a mais para errar em silêncio.
 */
export function textoDaRotaLiberada(entrada: {
  loja: string;
  paradas: ParadaDoAviso[];
}): string {
  const total = entrada.paradas.length;
  const mostradas = entrada.paradas.slice(0, PARADAS_NA_MENSAGEM);

  const linhas = [
    `${entrada.loja} — ${total} ${total === 1 ? 'entrega' : 'entregas'}`,
    '',
    ...mostradas.flatMap((parada, i) => [`${i + 1}. ${parada.cliente}`, `   ${parada.endereco}`]),
  ];

  const restantes = total - mostradas.length;
  if (restantes > 0) {
    linhas.push('', `…e mais ${restantes} ${restantes === 1 ? 'parada' : 'paradas'} na tela.`);
  }

  return linhas.join('\n');
}

/**
 * Avisa o motoboy no Telegram que a rota dele saiu. Nunca lança.
 *
 * Fica fora do caminho crítico por decisão: o Telegram fora do ar não pode
 * impedir uma rota de sair. O dono clicou "Saiu para entrega" porque o motoboy
 * está com as sacolas na mão — se a mensagem falhar, ele ainda tem a tela.
 */
export async function avisarRotaLiberada(routeId: string, establishmentId: string): Promise<void> {
  try {
    const token = env().TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const { getPrismaClient } = await import('@/infrastructure/persistence/prisma/client');
    const prisma = getPrismaClient(env().DATABASE_URL);

    const rota = await prisma.route.findFirst({
      where: { id: routeId, establishmentId },
      select: {
        accessToken: true,
        establishment: { select: { name: true } },
        courier: { select: { telegramChatId: true } },
        stops: {
          orderBy: { position: 'asc' },
          select: { order: { select: { customerName: true, address: true } } },
        },
      },
    });

    const chatId = rota?.courier.telegramChatId;
    if (!rota || !chatId) return;

    const { TelegramSender } = await import('@/infrastructure/messaging/telegram');

    await new TelegramSender(token).sendText(
      chatId,
      textoDaRotaLiberada({
        loja: rota.establishment.name,
        paradas: rota.stops.map((parada) => ({
          cliente: parada.order.customerName,
          endereco: parada.order.address,
        })),
      }),
      linkDaRota(rota.accessToken),
    );
  } catch (cause) {
    console.error('[telegram/rota] aviso não enviado', String(cause));
  }
}

/**
 * O botão Mini App só aceita HTTPS — o Telegram recusa a mensagem inteira se o
 * endereço for `http://localhost`. Em desenvolvimento vai o texto sem botão, que
 * é degradar; mandar e ver a mensagem sumir sem erro visível seria pior.
 */
function linkDaRota(accessToken: string): string | null {
  const base = env().PUBLIC_BASE_URL.replace(/\/$/, '');
  if (!base.startsWith('https://')) return null;

  return `${base}/m/${accessToken}`;
}
