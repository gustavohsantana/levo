import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';

const COOKIE = 'levo_session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // um turno de trabalho

export interface Session {
  userId: string;
  establishmentId: string;
  name: string;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

/**
 * Sessão em cookie httpOnly assinado.
 *
 * Sem biblioteca de autenticação: o produto tem um perfil de usuário (o dono) e
 * login por e-mail e senha. Trazer um framework inteiro para isso seria carregar
 * um peso de configuração e de conceitos que nada aqui usa — e mesmo assim
 * precisaríamos escrever o provider de credenciais.
 *
 * Motoboy tem cookie próprio (`levo_courier`): o app entra com usuário e senha
 * gerados pelo dono. Cliente final continua no link com token.
 */
export async function createSession(email: string, password: string): Promise<Session> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Compara o hash mesmo quando o usuário não existe: sem isso, a diferença de
  // tempo entre "e-mail inexistente" e "senha errada" vira um oráculo para
  // descobrir quais e-mails estão cadastrados.
  //
  // O hash falso precisa ser um bcrypt VÁLIDO. Uma string qualquer com cara de
  // hash é rejeitada pelo parser antes de qualquer trabalho criptográfico —
  // medido aqui: 0,17 ms contra 83 ms de uma comparação real. Uma diferença de
  // 470× é um oráculo ainda mais evidente do que não ter defesa nenhuma.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? decoyHash());

  if (!user || !valid) throw new UnauthorizedError();

  const token = await new SignJWT({ establishmentId: user.establishmentId, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env().isProduction,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  return { userId: user.id, establishmentId: user.establishmentId, name: user.name };
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  let sessao: Session;
  try {
    const { payload } = await jwtVerify(token, secret());
    sessao = {
      userId: String(payload.sub),
      establishmentId: String(payload.establishmentId),
      name: String(payload.name),
    };
  } catch {
    return null;
  }

  /*
   * O cookie diz quem é; o banco diz se ainda existe.
   *
   * O token é autocontido e vale 12 horas, então ele continua "válido" depois
   * de o usuário ser removido — ou de a loja inteira sumir. Sem esta conferência
   * a pessoa fica presa num laço sem saída: o painel quebra porque o
   * estabelecimento não existe, e `/login` a devolve para o painel porque a
   * sessão "existe". Não há tela por onde escapar, nem para o suporte.
   *
   * É uma busca por chave primária, e é o que também faz a remoção de acesso
   * valer de imediato em vez de esperar o cookie vencer.
   */
  const usuario = await getPrismaClient(env().DATABASE_URL).user.findUnique({
    where: { id: sessao.userId },
    select: { establishmentId: true },
  });

  if (!usuario || usuario.establishmentId !== sessao.establishmentId) return null;

  return sessao;
}

/** Para telas e ações que exigem o dono logado. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError('Sessão expirada');
  return session;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

let decoy: string | undefined;

/**
 * Hash bcrypt real, de uma senha aleatória que ninguém conhece, gerado uma vez
 * por processo. Comparar contra ele custa o mesmo que comparar contra o hash de
 * um usuário de verdade — que é exatamente o ponto.
 */
function decoyHash(): string {
  decoy ??= bcrypt.hashSync(globalThis.crypto.randomUUID(), 10);
  return decoy;
}
