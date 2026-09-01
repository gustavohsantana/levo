'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { containerFor } from '@/composition-root';
import { Address, Money } from '@/core';
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
    deliveryFeeReais: formData.get('deliveryFeeReais') || undefined,
    paymentMethod: formData.get('paymentMethod') || undefined,
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
  coordinates: { lat: number; lng: number } | null,
  novoEndereco?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.geocodeOrder.execute(
      orderId,
      coordinates ?? undefined,
      novoEndereco,
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Procura um endereço no mapa sem gravar nada.
 *
 * Serve para o dono corrigir o texto e **ver** onde caiu antes de confirmar —
 * bem mais honesto que arrastar um alfinete adivinhando, porque o endereço
 * certo também vai para o link do cliente e para a tela do motoboy.
 */
export async function buscarEnderecoAction(
  texto: string,
): Promise<{ ok: true; lat: number; lng: number } | { ok: false; error: string }> {
  try {
    const session = await requireSession();
    const container = containerFor(session.establishmentId);
    const { geocoder } = container;

    const endereco = Address.create(texto);
    const estabelecimento = await container.read((repos) => repos.establishments.current());

    const coordenadas = await geocoder
      .geocode(endereco, { city: estabelecimento.city, state: estabelecimento.state })
      .catch(() => null);

    if (!coordenadas) {
      return {
        ok: false,
        error: 'Não encontrei esse endereço. Tente com rua, número, bairro e cidade.',
      };
    }

    return { ok: true, lat: coordenadas.lat, lng: coordenadas.lng };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
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

/**
 * Motivos que a plataforma aceita para cancelar AQUELE pedido.
 *
 * Consultado na hora em que o lojista abre o diálogo, e não guardado: a lista
 * muda com o estado do pedido, e um código velho é recusado na hora de usar.
 *
 * Lista vazia não é erro — significa que a plataforma não ofereceu motivo, e o
 * cancelamento segue com o padrão dela.
 */
export type ReasonsResult =
  | { ok: true; reasons: Array<{ code: string; description: string }> }
  | { ok: false; error: string };

export async function cancellationReasonsAction(orderId: string): Promise<ReasonsResult> {
  try {
    const session = await requireSession();
    const motivos = await containerFor(session.establishmentId).useCases.cancelOrder.reasons(
      orderId,
    );
    return {
      ok: true,
      reasons: motivos.map((m) => ({ code: m.cancelCodeId, description: m.description })),
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Cancela o pedido na plataforma de origem.
 *
 * Síncrono, diferente das outras transições: o lojista precisa saber na hora se
 * o iFood recusou. Se enfileirasse, ele fecharia a tela achando que resolveu e
 * a comida sairia assim mesmo.
 */
export async function cancelOrderAction(
  orderId: string,
  reason: string,
  code: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.cancelOrder.execute(
      orderId,
      reason,
      code,
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Cidade e estado da operação.
 *
 * Editável porque entra em toda busca de endereço: um piloto em Pouso Alegre e
 * outro em Curitiba não podem compartilhar o mesmo palpite, e ninguém deveria
 * digitar a própria cidade em cada pedido.
 */
/**
 * Liga ou desliga o aceite automático de pedido de marketplace.
 *
 * Ação própria, e não parte do formulário de configurações: isto é um
 * interruptor que se vira no meio do turno, e obrigá-lo a reenviar cidade,
 * estado e slug faria um campo vazio apagar o que estava certo.
 */
export async function alternarAceiteAutomaticoAction(ligado: boolean): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) =>
      repos.establishments.setAutoConfirm(ligado),
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Conclui as entregas escolhidas de uma rota.
 *
 * Existe porque nem toda entrega é confirmada pelo motoboy: ele esquece, o
 * celular fica sem bateria, ou simplesmente não usa a tela. O dono precisa
 * fechar o dia sem depender disso — e sem ligar para cada um.
 */
export async function concluirEntregasAction(
  routeId: string,
  stopIds: string[],
): Promise<ActionResult> {
  if (stopIds.length === 0) return { ok: false, error: 'Selecione ao menos uma entrega.' };

  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.completeStop.executeMany(
      routeId,
      stopIds,
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

export interface GrupoInput {
  id?: string;
  name: string;
  min: number;
  max: number;
  options: Array<{ id?: string; name: string; priceReais: number }>;
}

/**
 * Cria ou edita um grupo de opções: tamanhos, sabores, bordas, adicionais.
 *
 * Devolve o grupo salvo para a tela anexar na hora — senão o produto novo
 * nasceria, o diálogo fecharia, e o dono teria que achar o grupo na lista
 * de baixo e marcar de novo.
 */
export async function salvarGrupoAction(
  grupo: GrupoInput,
): Promise<{ ok: true; grupo: { id: string; name: string; min: number; max: number; options: Array<{ id: string; name: string; priceCents: number }> } } | { ok: false; error: string }> {
  try {
    const session = await requireSession();
    const salvo = await containerFor(session.establishmentId).useCases.saveOptionGroup.execute(
      grupo,
    );
    revalidatePath('/dashboard/catalogo');
    return {
      ok: true,
      grupo: {
        id: salvo.id,
        name: salvo.name,
        min: salvo.min,
        max: salvo.max,
        options: salvo.options.map((o) => ({
          id: o.id,
          name: o.name,
          priceCents: o.price.cents,
        })),
      },
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function removerGrupoAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) => repos.optionGroups.delete(id));
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/catalogo');
  return { ok: true };
}

/** Define quais grupos um produto oferece, na ordem em que aparecem. */
export async function definirGruposDoProdutoAction(
  productId: string,
  groupIds: string[],
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) =>
      repos.optionGroups.setForProduct(productId, groupIds),
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/catalogo');
  return { ok: true };
}

/**
 * Anexa um grupo a todos os produtos de uma categoria.
 *
 * É o atalho que evita trinta cliques numa pizzaria com trinta sabores.
 */
export async function anexarGrupoNaCategoriaAction(
  groupId: string,
  categoria: string,
): Promise<{ ok: true; afetados: number } | { ok: false; error: string }> {
  try {
    const session = await requireSession();
    const afetados = await containerFor(session.establishmentId).read((repos) =>
      repos.optionGroups.attachToCategory(groupId, categoria),
    );
    revalidatePath('/dashboard/catalogo');
    return { ok: true, afetados };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function salvarRegiaoAction(formData: FormData): Promise<ActionResult> {
  const city = String(formData.get('city') ?? '').trim();
  const state = String(formData.get('state') ?? '').trim().toUpperCase();
  const taxa = Number(String(formData.get('deliveryFeeReais') ?? '0').replace(',', '.'));
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (city.length < 2) return { ok: false, error: 'Informe a cidade' };
  if (state.length !== 2) return { ok: false, error: 'O estado tem duas letras (ex.: MG)' };
  if (!Number.isFinite(taxa) || taxa < 0) return { ok: false, error: 'Taxa de entrega inválida' };
  if (slug.length < 3) return { ok: false, error: 'O endereço do cardápio é muito curto' };

  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) =>
      repos.establishments.saveSettings(city, state, Math.round(taxa * 100), slug),
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  return { ok: true };
}

/**
 * As faixas de taxa por distância.
 *
 * Chegam como JSON porque são uma lista de tamanho variável, e `FormData` não
 * representa isso sem inventar convenção de nome de campo.
 */
export async function salvarFaixasAction(bruto: string): Promise<ActionResult> {
  try {
    const lista = JSON.parse(bruto) as Array<{ km: number; reais: number }>;

    if (!Array.isArray(lista)) return { ok: false, error: 'Faixas inválidas' };

    for (const faixa of lista) {
      if (!Number.isFinite(faixa.km) || faixa.km <= 0) {
        return { ok: false, error: 'Cada faixa precisa de uma distância maior que zero' };
      }
      if (!Number.isFinite(faixa.reais) || faixa.reais < 0) {
        return { ok: false, error: 'Valor de taxa inválido' };
      }
    }

    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) =>
      repos.establishments.saveDeliveryFeeBands(
        lista.map((faixa) => ({
          uptoMeters: Math.round(faixa.km * 1000),
          fee: Money.fromReais(faixa.reais),
        })),
      ),
    );

    revalidatePath('/dashboard/configuracoes');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
