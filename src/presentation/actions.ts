'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { containerFor } from '@/composition-root';
import { createOrderSchema, credentialsSchema, planRouteSchema } from '@/application/dto/schemas';
import { createSession, destroySession, requireSession } from './http/session';
import { toFormError } from './http/error-mapper';
import { checkRateLimit, clearRateLimit } from './http/rate-limit';

/**
 * Server Actions: as mutações das telas do dono.
 *
 * Chamam os casos de uso diretamente. O `try/catch` aqui não é tratamento de
 * erro espalhado — é a fronteira que converte exceção em mensagem de
 * formulário, exatamente como o `error-mapper` faz para HTTP. Os dois são o
 * mesmo padrão em duas saídas.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  /**
   * Trava de força bruta.
   *
   * Sem isto, um script tenta senhas na velocidade que o servidor aguentar — e
   * o público deste produto usa senha de negócio pequeno, não gerada por
   * gerenciador. A chave é o e-mail: limitar por IP sozinho não protege quem
   * está sendo alvo, e limitar por e-mail impede que a conta seja martelada de
   * várias origens.
   */
  const limitKey = `login:${parsed.data.email}`;
  const limit = checkRateLimit(limitKey, { max: 10, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    const minutos = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      ok: false,
      error: `Muitas tentativas. Tente de novo em ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`,
    };
  }

  try {
    await createSession(parsed.data.email, parsed.data.password);
    clearRateLimit(limitKey);
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}

export async function createOrderAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createOrderSchema.safeParse({
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    address: formData.get('address'),
    reference: formData.get('reference'),
    amountReais: formData.get('amountReais') || 0,
    notes: formData.get('notes'),
    /*
     * Os itens chegam como JSON num campo escondido. Um `FormData` plano não
     * representa lista de objetos sem inventar convenção de nome — e a
     * convenção é justamente onde esse tipo de código costuma quebrar em
     * silêncio quando alguém renomeia um campo.
     */
    items: parseItens(formData.get('items')),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.createOrder.execute(parsed.data);
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function planRouteAction(input: {
  courierId: string;
  orderIds: string[];
}): Promise<ActionResult & { routeId?: string; savedMinutes?: number }> {
  const parsed = planRouteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    const session = await requireSession();
    const route = await containerFor(session.establishmentId).useCases.planRoute.execute(parsed.data);
    revalidatePath('/dashboard');
    return { ok: true, routeId: route.id, savedMinutes: route.savedMinutes };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function startRouteAction(routeId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.startRoute.execute(routeId);
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/rotas/${routeId}`);
  return { ok: true };
}

export async function fixOrderPinAction(
  orderId: string,
  coordinates: { lat: number; lng: number },
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.geocodeOrder.execute(orderId, coordinates);
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

/** Itens do catálogo, se houver. Entrada malformada vira pedido sem itens. */
function parseItens(bruto: FormDataEntryValue | null) {
  if (typeof bruto !== 'string' || !bruto.trim()) return undefined;

  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) && lista.length > 0 ? lista : undefined;
  } catch {
    // O schema recusaria mesmo assim; devolver `undefined` deixa a mensagem
    // ser sobre o pedido, não sobre JSON quebrado.
    return undefined;
  }
}

/**
 * Avança o pedido nas etapas de preparo.
 *
 * "Aceitei" e "saiu da cozinha" são decisões do lojista. Quando o pedido veio
 * de marketplace, viram aviso lá fora pela caixa de saída — o cliente vê o
 * pedido andar no aplicativo dele sem ninguém dar baixa duas vezes.
 */
export async function advanceOrderStageAction(
  orderId: string,
  stage: 'CONFIRMED' | 'READY',
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.advanceOrderStage.execute(
      orderId,
      stage,
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
