'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { hashPassword, requireSession } from './http/session';
import { getCourierSession } from './http/courier-session';
import { toFormError } from './http/error-mapper';
import { gerarSenhaDoApp, loginFromName } from './courier-login-id';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Gera (ou troca) o usuario e a senha do app deste motoboy.
 *
 * A senha so aparece agora: depois fica so o hash. Por isso a acao devolve o
 * valor, e a tela mostra uma vez para o dono mandar no WhatsApp.
 */
export async function gerarAcessoMotoboyAction(
  courierId: string,
): Promise<{ ok: true; login: string; password: string } | { ok: false; error: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);

    const courier = await prisma.courier.findFirst({
      where: { id: courierId, establishmentId: session.establishmentId },
      select: { id: true, name: true, login: true },
    });
    if (!courier) return { ok: false, error: 'Entregador não encontrado.' };

    const login = courier.login ?? (await loginLivre(prisma, loginFromName(courier.name)));
    const password = gerarSenhaDoApp();

    await prisma.courier.update({
      where: { id: courier.id },
      data: { login, passwordHash: hashPassword(password) },
    });

    revalidatePath(`/dashboard/entregadores/${courierId}`);
    return { ok: true, login, password };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function acessoDoMotoboy(courierId: string): Promise<{ login: string | null }> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);
  const courier = await prisma.courier.findFirst({
    where: { id: courierId, establishmentId: session.establishmentId },
    select: { login: true },
  });
  return { login: courier?.login ?? null };
}

export async function rotaAtualDoMotoboy(): Promise<{ accessToken: string } | null> {
  const session = await getCourierSession();
  if (!session) return null;
  const prisma = getPrismaClient(env().DATABASE_URL);

  const daLoja = { courierId: session.courierId, establishmentId: session.establishmentId };

  const emAndamento = await prisma.route.findFirst({
    where: { ...daLoja, status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'desc' },
    select: { accessToken: true },
  });
  if (emAndamento) return emAndamento;

  const planejada = await prisma.route.findFirst({
    where: { ...daLoja, status: 'PLANNED' },
    orderBy: { createdAt: 'desc' },
    select: { accessToken: true },
  });
  return planejada;
}

async function loginLivre(
  prisma: ReturnType<typeof getPrismaClient>,
  base: string,
): Promise<string> {
  let candidato = base;
  let n = 2;
  while (await prisma.courier.findUnique({ where: { login: candidato }, select: { id: true } })) {
    candidato = `${base}${n}`;
    n += 1;
  }
  return candidato;
}
