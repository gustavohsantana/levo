'use server';

import { revalidatePath } from 'next/cache';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { requireSession } from './http/session';
import { toFormError } from './http/error-mapper';

/**
 * O pareamento do WhatsApp, visto pelo painel.
 *
 * A WAHA fica presa no localhost da VM do worker — quem tem a chave dela manda
 * mensagem pelo WhatsApp da loja, e isso não pode ficar exposto na internet. O
 * painel roda na Vercel e não alcança aquele endereço.
 *
 * Então nada aqui fala com a WAHA. O worker é a ponte: estas ações só escrevem
 * o pedido e leem o que ele espelhou.
 */
export interface EstadoWhatsapp {
  status: string;
  qrBase64: string | null;
  conectadoComo: string | null;
  aguardando: boolean;
  ligado: boolean;
}

export async function estadoWhatsappAction(): Promise<EstadoWhatsapp> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);

  const [linha, loja] = await Promise.all([
    prisma.whatsappSession.findUnique({ where: { establishmentId: session.establishmentId } }),
    prisma.establishment.findUnique({
      where: { id: session.establishmentId },
      select: { whatsappRoutes: true },
    }),
  ]);

  /*
   * QR velho não é mostrado. Ele vive cerca de um minuto: exibir um vencido faz
   * o dono apontar a câmera, nada acontecer, e ele concluir que o sistema está
   * quebrado — quando bastava pedir outro.
   */
  const qrFresco =
    linha?.qrBase64 && linha.qrAt && Date.now() - linha.qrAt.getTime() < 55_000
      ? linha.qrBase64
      : null;

  return {
    status: linha?.status ?? 'DESCONHECIDO',
    qrBase64: qrFresco,
    conectadoComo: linha?.connectedAs ?? null,
    aguardando:
      linha?.pairRequestedAt != null
      && Date.now() - linha.pairRequestedAt.getTime() < 4 * 60_000,
    ligado: loja?.whatsappRoutes ?? false,
  };
}

/**
 * Pede o pareamento.
 *
 * Só marca a intenção; quem conversa com a WAHA é o worker, que acelera para
 * uma consulta a cada 3 segundos enquanto este pedido é recente. Sem isso o QR
 * chegaria à tela já vencido, porque o ciclo normal é de 30 segundos.
 */
export async function pedirQrWhatsappAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);

    await prisma.whatsappSession.upsert({
      where: { establishmentId: session.establishmentId },
      create: { establishmentId: session.establishmentId, pairRequestedAt: new Date() },
      update: { pairRequestedAt: new Date(), qrBase64: null, qrAt: null },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
