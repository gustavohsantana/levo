import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotFoundError } from '@/core';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { resolveRouteContext } from '@/presentation/driver-queries';
import { withValidation } from '@/presentation/http/route-helpers';

/**
 * O motoboy recusou a permissão de localização no aparelho.
 *
 * Registrar isso é o que permite ao dono distinguir "recusou o rastreio" de
 * "está com o aplicativo fechado". Uma é escolha dele, a outra é circunstância
 * — e são conversas completamente diferentes.
 *
 * Não bloqueia nada: só registra.
 */
export const POST = withValidation(z.object({ token: z.string().min(16) }), async ({ token }) => {
  const context = await resolveRouteContext(token);
  if (!context) throw new NotFoundError('Rota', token);

  const prisma = getPrismaClient(env().DATABASE_URL);
  const rota = await prisma.route.findUnique({
    where: { accessToken: token },
    select: { courierId: true },
  });

  if (rota) {
    await prisma.courier.update({
      where: { id: rota.courierId },
      data: { trackingDeniedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
});
