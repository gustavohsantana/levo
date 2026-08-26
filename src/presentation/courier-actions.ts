'use server';

import { revalidatePath } from 'next/cache';
import { containerFor } from '@/composition-root';
import { saveCourierSchema } from '@/application/dto/schemas';
import { requireSession } from './http/session';
import { toFormError } from './http/error-mapper';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function salvarEntregadorAction(formData: FormData): Promise<ActionResult> {
  const parsed = saveCourierSchema.safeParse({
    id: formData.get('id') ?? '',
    name: formData.get('name'),
    phone: formData.get('phone'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.saveCourier.execute({
      id: parsed.data.id || null,
      name: parsed.data.name,
      phone: parsed.data.phone,
    });

    revalidatePath('/dashboard/entregadores');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function alternarEntregadorAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.setCourierActive.execute(id, active);

    revalidatePath('/dashboard/entregadores');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
