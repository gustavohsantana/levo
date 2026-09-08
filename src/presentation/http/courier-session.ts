import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';

const COOKIE = 'levo_courier';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface CourierSession {
  courierId: string;
  establishmentId: string;
  name: string;
  login: string;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

/**
 * Sessao do motoboy — cookie separado do painel do dono.
 *
 * Sem isto, um login do entregador cairia na mesma sessao do dono e o app
 * abriria o dashboard. Sao dois publicos, dois cookies.
 */
export async function createCourierSession(login: string, password: string): Promise<CourierSession> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const courier = await prisma.courier.findUnique({
    where: { login: login.toLowerCase().trim() },
  });

  const valid = await bcrypt.compare(password, courier?.passwordHash ?? decoyHash());

  if (!courier || !courier.passwordHash || !courier.active || !valid) {
    throw new UnauthorizedError();
  }

  const token = await new SignJWT({
    establishmentId: courier.establishmentId,
    name: courier.name,
    login: courier.login,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(courier.id)
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

  return {
    courierId: courier.id,
    establishmentId: courier.establishmentId,
    name: courier.name,
    login: courier.login!,
  };
}

export async function getCourierSession(): Promise<CourierSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  let sessao: CourierSession;
  try {
    const { payload } = await jwtVerify(token, secret());
    sessao = {
      courierId: String(payload.sub),
      establishmentId: String(payload.establishmentId),
      name: String(payload.name),
      login: String(payload.login),
    };
  } catch {
    return null;
  }

  const courier = await getPrismaClient(env().DATABASE_URL).courier.findUnique({
    where: { id: sessao.courierId },
    select: { establishmentId: true, active: true, login: true, passwordHash: true },
  });

  if (
    !courier ||
    !courier.active ||
    !courier.passwordHash ||
    courier.establishmentId !== sessao.establishmentId ||
    courier.login !== sessao.login
  ) {
    return null;
  }

  return sessao;
}

export async function requireCourierSession(): Promise<CourierSession> {
  const session = await getCourierSession();
  if (!session) throw new UnauthorizedError('Sessão expirada');
  return session;
}

export async function destroyCourierSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env().isProduction,
    path: '/',
    maxAge: 0,
  });
}

let decoy: string | undefined;

function decoyHash(): string {
  decoy ??= bcrypt.hashSync(globalThis.crypto.randomUUID(), 10);
  return decoy;
}
