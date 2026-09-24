'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { containerFor } from '@/composition-root';
import { Address, Money, NotFoundError } from '@/core';
import { createOrderSchema, credentialsSchema, planRouteSchema } from '@/application/dto/schemas';
import { createSession, destroySession, requireSession } from './http/session';
import { toFormError } from './http/error-mapper';
import { checkRateLimit, clearRateLimit } from './http/rate-limit';
import { avisarRotaLiberada } from './telegram-rota';
import { entregasDoEntregador, type EntregaDoEntregador } from './reports';
import type { PausaIfood } from '@/infrastructure/integrations/ifood/merchant';
import type { ItemIfood } from '@/infrastructure/integrations/ifood/catalog';

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

/**
 * Marca ou desmarca um pedido como urgente.
 *
 * O gatilho é sempre humano — o cliente ligou cobrando —, e essa informação não
 * chega ao banco por outro caminho. Deduzir urgência do tempo de espera seria
 * chutar: pedido antigo não é necessariamente pedido reclamado, e um sistema que
 * reordena rota sozinho por palpite perde a confiança na primeira vez que erra.
 */
export async function marcarUrgenteAction(
  orderId: string,
  urgente: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const container = containerFor(session.establishmentId);

    await container.uow.run(async (repos) => {
      const order = await repos.orders.findById(orderId);
      if (!order) throw new NotFoundError('Pedido', orderId);

      if (urgente) order.marcarUrgente(new Date());
      else order.desmarcarUrgente();

      await repos.orders.save(order);
    });

    revalidatePath('/dashboard');
    revalidatePath('/cozinha');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
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
  revalidatePath('/cozinha');
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
  let establishmentId: string;

  try {
    const session = await requireSession();
    establishmentId = session.establishmentId;
    await containerFor(establishmentId).useCases.startRoute.execute(routeId);
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  /*
   * Fora do try acima de proposito: aqui a rota JA saiu.
   *
   * `avisarRotaLiberada` engole as proprias falhas, e o await existe porque
   * em serverless promessa nao esperada morre com a funcao — seria uma mensagem
   * que some sem deixar rastro nem erro.
   */
  await avisarRotaLiberada(routeId, establishmentId);

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
 * Devolve ao cliente o pagamento online de um pedido do cardápio da loja.
 *
 * Devolve o valor estornado para a tela poder dizer **quanto** voltou: "pronto"
 * sem número não é confirmação de nada quando o assunto é dinheiro, e é o
 * primeiro que o dono confere no extrato.
 *
 * `emAndamento` existe porque o Mercado Pago às vezes aceita o estorno e leva
 * alguns minutos para devolver. Chamar isso de concluído faria o dono garantir
 * ao cliente que o dinheiro já está lá.
 */
export type EstornoResult =
  | { ok: true; amountCents: number; emAndamento: boolean }
  | { ok: false; error: string };

export async function estornarPagamentoAction(orderId: string): Promise<EstornoResult> {
  try {
    const session = await requireSession();
    const resultado = await containerFor(session.establishmentId).useCases.refundPayment.execute(
      orderId,
    );

    revalidatePath('/dashboard');
    revalidatePath('/cozinha');
    return { ok: true, amountCents: resultado.amountCents, emAndamento: resultado.emAndamento };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
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
 * Liga o envio da rota pelo WhatsApp do motoboy.
 *
 * Separado do formulário de configurações pelo mesmo motivo do aceite
 * automático: é um interruptor que o dono vira sozinho, e junto exigiria
 * reenviar cidade, estado e slug — um deles chegando vazio apagaria o que
 * estava certo.
 */
export async function alternarRotaNoWhatsappAction(ligado: boolean): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) =>
      repos.establishments.setWhatsappRoutes(ligado),
    );
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  return { ok: true };
}

/**
 * Oferece retirada no balcão no cardápio público.
 *
 * Desligado por padrão: nem toda cozinha tem balcão, e oferecer retirada onde
 * ninguém pode buscar gera pedido que o dono vai ter que ligar para desfazer.
 */
export async function alternarRetiradaAction(ligado: boolean): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const { getPrismaClient } = await import('@/infrastructure/persistence/prisma/client');
    const { env } = await import('@/env');

    await getPrismaClient(env().DATABASE_URL).establishment.update({
      where: { id: session.establishmentId },
      data: { pickupEnabled: ligado },
    });
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  return { ok: true };
}

/**
 * Exige o código do cliente para o entregador fechar a entrega.
 *
 * O painel continua podendo concluir sem código, de propósito: telefone
 * descarregado e portão sem ninguém existem, e travar a operação por causa
 * deles seria pior que o problema que o código resolve.
 */
export async function alternarCodigoDeEntregaAction(ligado: boolean): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const { getPrismaClient } = await import('@/infrastructure/persistence/prisma/client');
    const { env } = await import('@/env');

    await getPrismaClient(env().DATABASE_URL).establishment.update({
      where: { id: session.establishmentId },
      data: { requireDeliveryCode: ligado },
    });
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/configuracoes');
  return { ok: true };
}

/**
 * Liga o pedido de localização ao vivo ao motoboy, pelo Telegram.
 *
 * O bot pede; quem decide compartilhar é ele. Rastrear alguém sem que ele saiba
 * não é um recurso — e no Telegram isso nem é possível, o que é uma qualidade
 * do canal, não uma limitação.
 */
export async function alternarLocalizacaoTelegramAction(
  ligado: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const { getPrismaClient } = await import('@/infrastructure/persistence/prisma/client');
    const { env } = await import('@/env');

    await getPrismaClient(env().DATABASE_URL).establishment.update({
      where: { id: session.establishmentId },
      data: { telegramLocation: ligado },
    });
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }

  revalidatePath('/dashboard/integracoes');
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
  const name = String(formData.get('name') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
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

  if (name.length < 2) return { ok: false, error: 'Informe o nome da loja' };
  if (address.length < 5) return { ok: false, error: 'Informe o endereço da loja' };
  if (city.length < 2) return { ok: false, error: 'Informe a cidade' };
  if (state.length !== 2) return { ok: false, error: 'O estado tem duas letras (ex.: MG)' };
  if (!Number.isFinite(taxa) || taxa < 0) return { ok: false, error: 'Taxa de entrega inválida' };
  if (slug.length < 3) return { ok: false, error: 'O endereço do cardápio é muito curto' };

  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).read((repos) =>
      repos.establishments.saveSettings(name, address, city, state, Math.round(taxa * 100), slug),
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

/**
 * As entregas de um motoboy no período, para o modal do relatório.
 *
 * O relatório mostra o resumo por motoboy; ao clicar num, a tela pede aqui a
 * lista das entregas dele — carregada sob demanda, porque ninguém abre o
 * detalhe de todos os motoboys, e trazer tudo de antemão pesaria o relatório à
 * toa.
 */
export async function entregasDoEntregadorAction(
  courierId: string,
  de: string,
  ate: string,
): Promise<{ ok: true; entregas: EntregaDoEntregador[] } | { ok: false; error: string }> {
  try {
    const entregas = await entregasDoEntregador(courierId, { de, ate });
    return { ok: true, entregas };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Ações do módulo Merchant do iFood, para a tela de homologação.
 *
 * Cada uma pega o cliente do lojista e devolve a mensagem do iFood no erro —
 * é ela que diz, por exemplo, para esperar antes de remover uma pausa recém
 * criada. Sem loja conectada, devolve um erro claro em vez de estourar.
 */
async function merchantDoLojista() {
  const session = await requireSession();
  const m = await containerFor(session.establishmentId).ifoodMerchant();
  if (!m) throw new Error('iFood não conectado nesta loja.');
  return m;
}

/**
 * A lista de pausas do iFood é eventualmente consistente: o POST devolve 200 na
 * hora, mas a pausa só entra no `listarPausas` alguns segundos depois. Devolver
 * a pausa criada aqui deixa a tela mostrá-la na hora, sem esperar a lista pegar
 * o passo — senão o lojista cria, não vê nada e acha que falhou.
 */
export async function criarPausaIfoodAction(
  description: string,
  start: string,
  end: string,
): Promise<ActionResult & { pausa?: PausaIfood }> {
  try {
    const { merchant, merchantId } = await merchantDoLojista();
    const pausa = await merchant.criarPausa(merchantId, { description, start, end });
    return { ok: true, pausa };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function removerPausaIfoodAction(interrupcaoId: string): Promise<ActionResult> {
  try {
    const { merchant, merchantId } = await merchantDoLojista();
    await merchant.removerPausa(merchantId, interrupcaoId);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function definirHorariosIfoodAction(
  shifts: Array<{ dayOfWeek: string; start: string; duration: number }>,
): Promise<ActionResult> {
  try {
    const { merchant, merchantId } = await merchantDoLojista();
    await merchant.definirHorarios(merchantId, shifts);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Ações do módulo Loja do aiqfome (paridade com o Merchant do iFood).
 *
 * A disponibilidade é um toggle: abrir / pausar (stand-by) / fechar — não há
 * pausa datada como no iFood. Cada ação devolve a mensagem do aiqfome no erro.
 */
async function lojaAiqfomeDoLojista() {
  const session = await requireSession();
  const l = await containerFor(session.establishmentId).aiqfomeLoja();
  if (!l) throw new Error('aiqfome não conectado nesta loja.');
  return l;
}

export async function abrirLojaAiqfomeAction(): Promise<ActionResult> {
  try {
    const { loja, storeId } = await lojaAiqfomeDoLojista();
    await loja.abrir(storeId);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function pausarLojaAiqfomeAction(): Promise<ActionResult> {
  try {
    const { loja, storeId } = await lojaAiqfomeDoLojista();
    await loja.pausar(storeId);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function fecharLojaAiqfomeAction(): Promise<ActionResult> {
  try {
    const { loja, storeId } = await lojaAiqfomeDoLojista();
    await loja.fechar(storeId);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function definirHorariosAiqfomeAction(
  dias: Array<{
    week_day_number: number;
    week_day_name: string;
    status: number;
    hours: { first_period: string; second_period?: string };
  }>,
): Promise<ActionResult> {
  try {
    const { loja, storeId } = await lojaAiqfomeDoLojista();
    await loja.definirHorarios(storeId, dias);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Ações do módulo Cardápio do aiqfome (escrita).
 *
 * Começando pelos toggles de disponibilidade — item e categoria — que são
 * `PUT .../toggle-status` sem corpo. Dependem do escopo `aqf:menu:create`.
 */
async function catalogoAiqfomeDoLojista() {
  const session = await requireSession();
  const c = await containerFor(session.establishmentId).aiqfomeCatalogo();
  if (!c) throw new Error('aiqfome não conectado nesta loja.');
  return c;
}

export async function alternarItemAiqfomeAction(itemUuid: string): Promise<ActionResult> {
  try {
    const { catalogo, storeId } = await catalogoAiqfomeDoLojista();
    await catalogo.alternarItem(storeId, itemUuid);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function alternarCategoriaAiqfomeAction(
  categoryId: string,
): Promise<ActionResult> {
  try {
    const { catalogo, storeId } = await catalogoAiqfomeDoLojista();
    await catalogo.alternarCategoria(storeId, categoryId);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

// ---- Catalog (cardápio no iFood) ----

async function catalogDoLojista() {
  const session = await requireSession();
  const c = await containerFor(session.establishmentId).ifoodCatalog();
  if (!c) throw new Error('iFood não conectado nesta loja.');
  return c.catalog;
}

/** Carrega um item já existente (com seus complementos) para edição na tela. */
export async function carregarItemCatalogoAction(
  itemId: string,
  categoryId: string,
): Promise<ActionResult & { item?: ItemIfood }> {
  try {
    const item = await (await catalogDoLojista()).itemParaEditar(itemId, categoryId);
    return { ok: true, item };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Exclui um item do catálogo do iFood (apaga o produto que o sustenta). */
export async function removerItemIfoodAction(productId: string): Promise<ActionResult> {
  try {
    await (await catalogDoLojista()).removerItem(productId);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 1: criar categoria. */
export async function criarCategoriaCatalogoAction(
  catalogId: string,
  nome: string,
): Promise<ActionResult & { categoria?: { id: string; name: string } }> {
  try {
    const catalog = await catalogDoLojista();
    const c = await catalog.criarCategoria(catalogId, nome);
    return { ok: true, categoria: { id: c.id, name: c.name } };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 1: criar item (com foto opcional). Devolve o item com os ids do iFood. */
export async function criarItemCatalogoAction(input: {
  categoryId: string;
  nome: string;
  descricao?: string;
  precoReais: number;
  ativo: boolean;
  imagemDataUri?: string;
}): Promise<ActionResult & { item?: ItemIfood }> {
  try {
    const catalog = await catalogDoLojista();
    const imagePath = input.imagemDataUri ? await catalog.enviarImagem(input.imagemDataUri) : undefined;
    const item = await catalog.salvarItem({
      categoryId: input.categoryId,
      externalCode: `LEVO-${Date.now()}`,
      status: input.ativo ? 'AVAILABLE' : 'UNAVAILABLE',
      priceValue: input.precoReais,
      produto: { name: input.nome, description: input.descricao, imagePath },
      grupos: [],
    });
    return { ok: true, item };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 2: anexar um grupo de complementos ao item. Reenvia a estrutura inteira. */
export async function adicionarGrupoCatalogoAction(input: {
  item: ItemIfood;
  nomeGrupo: string;
  min: number;
  max: number;
  complementos: Array<{ nome: string; precoReais: number; ativo: boolean; imagemDataUri?: string }>;
}): Promise<ActionResult & { item?: ItemIfood }> {
  try {
    const catalog = await catalogDoLojista();
    const opcoes = [];
    for (const c of input.complementos) {
      const imagePath = c.imagemDataUri ? await catalog.enviarImagem(c.imagemDataUri) : undefined;
      opcoes.push({
        name: c.nome,
        priceValue: c.precoReais,
        status: (c.ativo ? 'AVAILABLE' : 'UNAVAILABLE') as ItemIfood['status'],
        imagePath,
      });
    }
    const item = await catalog.salvarItem({
      ...input.item,
      grupos: [
        ...input.item.grupos,
        { name: input.nomeGrupo, status: 'AVAILABLE', min: input.min, max: input.max, opcoes },
      ],
    });
    return { ok: true, item };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 3: mudar nome/descrição/foto do item (PUT — não há PATCH para isso). */
export async function editarItemCatalogoAction(input: {
  item: ItemIfood;
  novoNome?: string;
  descricao?: string;
  novaImagemDataUri?: string;
}): Promise<ActionResult & { item?: ItemIfood }> {
  try {
    const catalog = await catalogDoLojista();
    const imagePath = input.novaImagemDataUri
      ? await catalog.enviarImagem(input.novaImagemDataUri)
      : input.item.produto.imagePath;
    const item = await catalog.salvarItem({
      ...input.item,
      produto: {
        ...input.item.produto,
        name: input.novoNome ?? input.item.produto.name,
        description: input.descricao ?? input.item.produto.description,
        imagePath,
      },
    });
    return { ok: true, item };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 3: mudar nome/foto de um complemento (PUT). */
export async function editarComplementoCatalogoAction(input: {
  item: ItemIfood;
  optionId: string;
  novoNome?: string;
  novaImagemDataUri?: string;
}): Promise<ActionResult & { item?: ItemIfood }> {
  try {
    const catalog = await catalogDoLojista();
    const imagePath = input.novaImagemDataUri ? await catalog.enviarImagem(input.novaImagemDataUri) : undefined;
    const grupos = input.item.grupos.map((g) => ({
      ...g,
      opcoes: g.opcoes.map((o) =>
        o.id === input.optionId
          ? { ...o, name: input.novoNome ?? o.name, imagePath: imagePath ?? o.imagePath }
          : o,
      ),
    }));
    const item = await catalog.salvarItem({ ...input.item, grupos });
    return { ok: true, item };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 3: preço do item — PATCH /items/price. */
export async function precoItemCatalogoAction(itemId: string, precoReais: number): Promise<ActionResult> {
  try {
    await (await catalogDoLojista()).precoItem(itemId, precoReais);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 3: disponibilidade do item — PATCH /items/status. */
export async function statusItemCatalogoAction(itemId: string, ativo: boolean): Promise<ActionResult> {
  try {
    await (await catalogDoLojista()).statusItem(itemId, ativo ? 'AVAILABLE' : 'UNAVAILABLE');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 3: preço do complemento — PATCH /options/price. */
export async function precoComplementoCatalogoAction(
  optionId: string,
  precoReais: number,
): Promise<ActionResult> {
  try {
    await (await catalogDoLojista()).precoOpcao(optionId, precoReais);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Cenário 3: pausar/ativar o complemento — PATCH /options/status. */
export async function statusComplementoCatalogoAction(
  optionId: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    await (await catalogDoLojista()).statusOpcao(optionId, ativo ? 'AVAILABLE' : 'UNAVAILABLE');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
