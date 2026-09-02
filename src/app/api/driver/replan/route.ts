import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Coordinates, NotFoundError } from '@/core';
import { resolveRouteContext } from '@/presentation/driver-queries';
import { withValidation } from '@/presentation/http/route-helpers';

const schema = z.object({
  token: z.string().min(16),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Recalcula o que falta a partir de onde o motoboy está.
 *
 * Sem sessão: o token da rota é a credencial, como no resto da tela dele. E a
 * posição vem do aparelho, não do último ping — o ping pode ter minutos, e a
 * rota inteira seria montada a partir de onde ele já não está.
 */
export const POST = withValidation(schema, async ({ token, lat, lng }) => {
  const context = await resolveRouteContext(token);
  if (!context) throw new NotFoundError('Rota', token);

  const resultado = await context.container.useCases.replanFromHere.execute(
    context.routeId,
    Coordinates.create(lat, lng),
  );

  return NextResponse.json(resultado);
});
