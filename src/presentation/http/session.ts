import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';

const COOKIE = 'giro_session';
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
 * Motoboy e cliente final não passam por aqui: entram por link com token, que é
 * o que sobrevive à realidade de campo.
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

  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.sub),
      establishmentId: String(payload.establishmentId),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
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
