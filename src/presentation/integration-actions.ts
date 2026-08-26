'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { env } from '@/env';
import { IfoodAuth } from '@/infrastructure/integrations/ifood/auth';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { listarLojasAiqfome } from '@/infrastructure/integrations/aiqfome/stores';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { requireSession } from './http/session';
import { toFormError } from './http/error-mapper';

/**
 * Conectar o iFood pela tela, não pelo terminal.
 *
 * O fluxo distribuído do iFood tem uma ida e volta que não dá para automatizar:
 * o lojista precisa digitar um código no Portal do Parceiro e trazer de volta
 * um código de autorização. O que o produto pode fazer é tornar isso legível —
 * gerar o código, mostrar o link e receber a resposta num campo.
 *
 * Antes disso a vinculação exigia rodar um script pelo terminal, o que na
 * prática significava que só quem escreveu o sistema conseguia conectar um
 * cliente.
 */
const COOKIE_VERIFIER = 'levo_ifood_verifier';

/**
 * Quanto tempo o `verifier` sobrevive — de propósito, mais que o código.
 *
 * O *userCode* vale dez minutos no iFood; o **código de autorização** que o
 * portal devolve depois tem validade própria. Amarrar o cookie aos dez minutos
 * fazia a tela desistir enquanto o iFood ainda aceitaria a troca, e com uma
 * mensagem que culpava o código — mandando o lojista refazer um passo que
 * estava certo.
 *
 * Meia hora cobre o caminho real: aprovar permissão no portal, achar a tela
 * certa, voltar. Se o código de fato venceu, quem diz isso é o iFood, e a
 * mensagem dele é mais confiável que o nosso palpite.
 */
const TTL_SEGUNDOS = 60 * 30;

export type InicioVinculacao =
  | { ok: true; userCode: string; verificationUrl: string; expiraEmMinutos: number }
  | { ok: false; error: string };

function auth(): IfoodAuth {
  const config = env();

  if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) {
    throw new Error('Integração com o iFood não configurada neste ambiente.');
  }

  return new IfoodAuth({
    clientId: config.IFOOD_CLIENT_ID,
    clientSecret: config.IFOOD_CLIENT_SECRET,
  });
}

export async function iniciarVinculacaoIfood(): Promise<InicioVinculacao> {
  try {
    await requireSession();

    const { userCode, authorizationCodeVerifier, verificationUrl, expiresInSeconds } =
      await auth().requestUserCode();

    /*
     * O `verifier` precisa sobreviver até o segundo passo, e é secreto: quem o
     * tiver, junto com o código de autorização, fecha a vinculação. Vai em
     * cookie httpOnly em vez de campo escondido no formulário, que o navegador
     * entrega a qualquer script da página.
     */
    (await cookies()).set(COOKIE_VERIFIER, authorizationCodeVerifier, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env().isProduction,
      path: '/',
      maxAge: TTL_SEGUNDOS,
    });

    return {
      ok: true,
      userCode,
      verificationUrl,
      expiraEmMinutos: Math.round(expiresInSeconds / 60),
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export type FimVinculacao =
  | { ok: true; lojas: Array<{ id: string; nome: string }> }
  | { ok: false; error: string };

export async function concluirVinculacaoIfood(
  authorizationCode: string,
): Promise<FimVinculacao> {
  try {
    const session = await requireSession();
    const jar = await cookies();
    const verifier = jar.get(COOKIE_VERIFIER)?.value;

    if (!verifier) {
      return {
        ok: false,
        error:
          'Esta vinculação expirou ou foi iniciada em outro navegador. ' +
          'Gere um novo código de conexão e refaça, sem fechar esta aba.',
      };
    }

    const codigo = authorizationCode.trim();
    if (!codigo) return { ok: false, error: 'Cole o código de autorização do portal.' };

    const tokens = await auth().exchangeAuthorizationCode({
      authorizationCode: codigo,
      authorizationCodeVerifier: verifier,
    });

    // Um só uso: o verifier não serve para uma segunda tentativa.
    jar.delete(COOKIE_VERIFIER);

    const lojas = await buscarLojas(tokens.accessToken);

    if (lojas.length === 0) {
      return {
        ok: false,
        error: 'Nenhuma loja encontrada nesta conta do iFood.',
      };
    }

    const prisma = getPrismaClient(env().DATABASE_URL);
    const store = new CredentialStore(prisma, env().AUTH_SECRET);

    /*
     * Com uma loja só, vincula direto. Com mais de uma, grava o acesso e deixa
     * o dono escolher — pedir para ele decidir antes de a gente sequer saber o
     * nome das lojas seria pedir que adivinhasse.
     */
    await store.save(session.establishmentId, 'IFOOD', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      merchantId: lojas.length === 1 ? lojas[0].id : null,
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true, lojas };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function escolherLojaIfood(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);
    const store = new CredentialStore(prisma, env().AUTH_SECRET);

    const atual = await store.read(session.establishmentId, 'IFOOD');
    if (!atual) return { ok: false, error: 'Conecte a conta do iFood primeiro.' };

    await store.save(session.establishmentId, 'IFOOD', { ...atual, merchantId });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function desconectarIfood(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);

    await prisma.integrationCredential.deleteMany({
      where: { establishmentId: session.establishmentId, provider: 'IFOOD' },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

async function buscarLojas(accessToken: string): Promise<Array<{ id: string; nome: string }>> {
  const resposta = await fetch('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });

  if (!resposta.ok) return [];

  const lojas = (await resposta.json()) as Array<{ id: string; name?: string }>;
  return Array.isArray(lojas)
    ? lojas.map((loja) => ({ id: loja.id, nome: loja.name ?? loja.id }))
    : [];
}

/**
 * O aiqfome não tem o vaivém de código do iFood: o lojista é redirecionado,
 * consente e volta. Por isso aqui só existem as ações de depois — escolher a
 * loja e desconectar. O começo é um link para `/api/integrations/aiqfome/connect`,
 * que precisa ser navegação de verdade para o cookie de `state` viajar junto.
 */
export async function lojasAiqfome(): Promise<Array<{ id: string; nome: string }>> {
  try {
    const session = await requireSession();
    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);

    const credencial = await store.read(session.establishmentId, 'AIQFOME');
    if (!credencial) return [];

    return await listarLojasAiqfome(credencial.accessToken);
  } catch {
    return [];
  }
}

export async function escolherLojaAiqfome(
  merchantId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);

    const atual = await store.read(session.establishmentId, 'AIQFOME');
    if (!atual) return { ok: false, error: 'Conecte o aiqfome primeiro.' };

    await store.save(session.establishmentId, 'AIQFOME', { ...atual, merchantId });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function desconectarAiqfome(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();

    await getPrismaClient(env().DATABASE_URL).integrationCredential.deleteMany({
      where: { establishmentId: session.establishmentId, provider: 'AIQFOME' },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
