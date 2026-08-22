import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotFoundError } from '@/core';
import { completeStopSchema } from '@/application/dto/schemas';
import { resolveRouteContext } from '@/presentation/driver-queries';
import { withValidation } from '@/presentation/http/route-helpers';

const schema = completeStopSchema.extend({ token: z.string().min(16) });

/**
 * Marca uma parada como entregue ou não entregue.
 *
 * `occurredAt` vem preenchido quando a marcação estava na fila offline do
 * celular — é o horário do toque, não o da sincronização.
 */
export const POST = withValidation(schema, async ({ token, ...input }) => {
  const context = await resolveRouteContext(token);
  if (!context) throw new NotFoundError('Rota', token);

  await context.container.useCases.completeStop.execute(context.routeId, input);

  return NextResponse.json({ ok: true });
});
