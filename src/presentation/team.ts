'use server';

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ValidationError } from '@/core';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { env } from '@/env';
import { requireSession, hashPassword } from './http/session';
import { toFormError } from './http/error-mapper';

export type ActionResult = { ok: true } | { ok: false; error: string };

const novoAcessoSchema = z.object({
  nome: z.string().trim().min(2, 'Diga o nome da pessoa'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'Senha de no mínimo 8 caracteres'),
});

/**
 * Um acesso a mais para a loja.
 *
 * Até agora a loja tinha exatamente um login, para sempre — o do cadastro. Na
 * prática isso significa o dono passando a própria senha para o gerente e para
 * quem fica no caixa, e ninguém sabendo depois quem aceitou qual pedido.
 *
 * Sem papéis nem permissões, de propósito: numa loja de dois a cinco motoboys,
 * quem tem acesso ao painel tem acesso ao painel. Inventar níveis agora seria
 * resolver um problema que ninguém tem e atrapalhar o que todos têm, que é dar
 * um login para a segunda pessoa.
 */
export async function criarAcessoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = novoAcessoSchema.safeParse({
    nome: formData.get('nome'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const prisma = getPrismaClient(env().DATABASE_URL);

  try {
    /*
     * O e-mail é único no sistema inteiro, não por loja.
     *
     * Então "já existe" pode significar duas coisas bem diferentes: a pessoa já
     * está nesta loja, ou está em outra. A mensagem não distingue — dizer "esse
     * e-mail pertence a outro estabelecimento" entregaria, para quem quisesse
     * pescar, quem é cliente do Levô.
     */
    const existente = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existente) {
      return { ok: false, error: 'Esse e-mail já está em uso. Use outro.' };
    }

    await prisma.user.create({
      data: {
        establishmentId: session.establishmentId,
        email: parsed.data.email,
        name: parsed.data.nome,
        passwordHash: hashPassword(parsed.data.password),
      },
    });
  } catch (cause) {
    if (cause instanceof ValidationError) return { ok: false, error: cause.message };
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  return { ok: true };
}

/**
 * Tira o acesso de alguém.
 *
 * A própria conta nunca: quem se remove sozinho tranca a loja para fora, e não
 * existe tela para desfazer isso. É a única regra aqui, e é a que impede o
 * suporte de virar recuperação de conta.
 */
export async function removerAcessoAction(userId: string): Promise<ActionResult> {
  const session = await requireSession();

  if (userId === session.userId) {
    return { ok: false, error: 'Você não pode remover o seu próprio acesso.' };
  }

  const prisma = getPrismaClient(env().DATABASE_URL);

  try {
    /*
     * `deleteMany` com o estabelecimento no filtro, e não `delete` por id: é o
     * que impede o id de outra loja de ser removido daqui. Mesmo padrão que o
     * resto dos repositórios usa.
     */
    const { count } = await prisma.user.deleteMany({
      where: { id: userId, establishmentId: session.establishmentId },
    });
    if (count === 0) return { ok: false, error: 'Acesso não encontrado.' };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  return { ok: true };
}

export interface AcessoView {
  id: string;
  nome: string;
  email: string;
  ehVoce: boolean;
}

/** Quem entra nesta loja. */
export async function listarAcessos(): Promise<AcessoView[]> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);

  const usuarios = await prisma.user.findMany({
    where: { establishmentId: session.establishmentId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true },
  });

  return usuarios.map((u) => ({
    id: u.id,
    nome: u.name,
    email: u.email,
    ehVoce: u.id === session.userId,
  }));
}
