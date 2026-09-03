'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { containerFor } from '@/composition-root';
import { saveCourierSchema } from '@/application/dto/schemas';
import { requireSession } from './http/session';
import { toFormError } from './http/error-mapper';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function salvarEntregadorAction(formData: FormData): Promise<ActionResult> {
  const parsed = saveCourierSchema.safeParse({
    id: formData.get('id') ?? '',
    name: formData.get('name'),
    phone: formData.get('phone'),
    maxStops: formData.get('maxStops') ?? 15,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.saveCourier.execute({
      id: parsed.data.id || null,
      name: parsed.data.name,
      phone: parsed.data.phone,
      maxStops: parsed.data.maxStops,
    });

    revalidatePath('/dashboard/entregadores');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function alternarEntregadorAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.setCourierActive.execute(id, active);

    revalidatePath('/dashboard/entregadores');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Grava o acordo de pagamento de um motoboy.
 *
 * As faixas chegam em quilômetros porque é assim que o dono negocia; o banco
 * guarda metros, que é a unidade da rota.
 */
export async function salvarAcordoAction(
  courierId: string,
  acordo: {
    model: 'POR_ENTREGA' | 'POR_FAIXA' | 'DIARIA_E_ENTREGA';
    perDeliveryCents: number;
    dailyCents: number;
    bands: Array<{ uptoMeters: number; amountCents: number }>;
  },
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.saveCourierPay.execute({
      courierId,
      ...acordo,
    });

    revalidatePath(`/dashboard/entregadores/${courierId}`);
    revalidatePath('/dashboard/relatorios');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Gera o convite do Telegram para um motoboy.
 *
 * O bot não pode iniciar conversa — e é essa regra que torna o canal seguro.
 * Então o caminho é o inverso: o dono manda este link, o motoboy toca, e a
 * partir daí o aviso é automático para sempre.
 *
 * O código é de uso único e morre quando ele toca. Ele viaja por WhatsApp, é
 * encaminhado, fica no histórico de grupo — se continuasse valendo, qualquer um
 * que o encontrasse passaria a receber as rotas daquele motoboy, com endereço
 * de cliente dentro.
 */
export async function gerarConviteTelegramAction(
  courierId: string,
): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  try {
    const session = await requireSession();
    const { env } = await import('@/env');
    const { getPrismaClient } = await import('@/infrastructure/persistence/prisma/client');
    const { TelegramSender } = await import('@/infrastructure/messaging/telegram');

    const token = env().TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { ok: false, error: 'O bot do Telegram ainda não foi configurado.' };
    }

    const prisma = getPrismaClient(env().DATABASE_URL);
    const courier = await prisma.courier.findFirst({
      where: { id: courierId, establishmentId: session.establishmentId },
      select: { id: true },
    });
    if (!courier) return { ok: false, error: 'Entregador não encontrado.' };

    const usuario = await new TelegramSender(token).username();
    if (!usuario) return { ok: false, error: 'Não consegui falar com o Telegram agora.' };

    // 128 bits: o código é a única coisa entre um estranho e as rotas dele.
    const codigo = randomUUID().replace(/-/g, '');
    await prisma.courier.update({
      where: { id: courier.id },
      data: { telegramInviteCode: codigo, telegramChatId: null },
    });

    revalidatePath(`/dashboard/entregadores/${courierId}`);
    return { ok: true, link: `https://t.me/${usuario}?start=${codigo}` };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
