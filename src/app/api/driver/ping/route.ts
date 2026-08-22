import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotFoundError } from '@/core';
import { courierPingSchema } from '@/application/dto/schemas';
import { resolveRouteContext } from '@/presentation/driver-queries';
import { withValidation } from '@/presentation/http/route-helpers';

const schema = courierPingSchema.extend({ token: z.string().min(16) });

/**
 * Posição do motoboy, a cada ~15s enquanto a rota corre.
 *
 * Sem sessão: o token da rota é a credencial. Endpoint de escrita mais quente
 * do sistema — mantido do tamanho de um cartão-postal de propósito.
 */
export const POST = withValidation(schema, async ({ token, lat, lng, at }) => {
  const context = await resolveRouteContext(token);
  if (!context) throw new NotFoundError('Rota', token);

  await context.container.useCases.recordPing.execute(context.routeId, { lat, lng, at });

  return NextResponse.json({ ok: true });
});
