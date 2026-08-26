'use server';

import { containerFor } from '@/composition-root';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { createOrderSchema } from '@/application/dto/schemas';
import { toFormError } from './http/error-mapper';
import { checkRateLimit } from './http/rate-limit';

/**
 * O cardápio público e o pedido feito pelo próprio cliente.
 *
 * Não há sessão aqui: quem abre é o cliente do restaurante, e o que identifica
 * o estabelecimento é o `slug` da URL. Por isso cada função resolve o
 * estabelecimento a partir dele — nunca de algo que o navegador tenha mandado.
 *
 * É a única superfície do produto aberta à internet que **escreve** no banco, e
 * o resto do arquivo existe por causa disso.
 */
export interface MenuPublico {
  establishment: { name: string; slug: string; deliveryFeeReais: number };
  categorias: Array<{
    nome: string;
    produtos: Array<{
      id: string;
      name: string;
      description: string | null;
      priceCents: number;
      imageUrl: string | null;
    }>;
  }>;
}

export async function getMenuPublico(slug: string): Promise<MenuPublico | null> {
  const prisma = getPrismaClient(env().DATABASE_URL);

  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, deliveryFeeCents: true },
  });

  if (!establishment?.slug) return null;

  /*
   * Só produtos ativos. Item pausado é item que acabou — mostrá-lo ao cliente
   * gera pedido que o restaurante vai ter que desmarcar no telefone.
   */
  const produtos = await prisma.product.findMany({
    where: { establishmentId: establishment.id, active: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      category: true,
    },
  });

  const porCategoria = new Map<string, MenuPublico['categorias'][number]['produtos']>();

  for (const produto of produtos) {
    const chave = produto.category ?? 'Outros';
    const atual = porCategoria.get(chave) ?? [];
    atual.push(produto);
    porCategoria.set(chave, atual);
  }

  return {
    establishment: {
      name: establishment.name,
      slug: establishment.slug,
      deliveryFeeReais: establishment.deliveryFeeCents / 100,
    },
    categorias: [...porCategoria.entries()].map(([nome, produtos]) => ({ nome, produtos })),
  };
}

export type PedidoPublicoResult =
  | { ok: true; trackingUrl: string }
  | { ok: false; error: string };

export async function criarPedidoPublicoAction(
  slug: string,
  formData: FormData,
): Promise<PedidoPublicoResult> {
  /*
   * Freio por estabelecimento.
   *
   * Endpoint público que escreve no banco é convite para script — e o estrago
   * aqui não é técnico, é operacional: cinquenta pedidos falsos entrando no
   * painel no meio do sábado tiram o dono do ar sozinhos. Vinte por minuto
   * cobre a casa cheia e barra a brincadeira.
   */
  const limite = checkRateLimit(`menu:${slug}`, { max: 20, windowMs: 60_000 });
  if (!limite.allowed) {
    return { ok: false, error: 'Muitos pedidos agora. Tente de novo em instantes.' };
  }

  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!establishment) return { ok: false, error: 'Cardápio não encontrado.' };

  const parsed = createOrderSchema.safeParse({
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    address: formData.get('address'),
    reference: formData.get('reference'),
    amountReais: 0,
    notes: formData.get('notes'),
    items: parseItens(formData.get('items')),
    paymentMethod: formData.get('paymentMethod') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  /*
   * Pedido sem item é pedido vazio. No painel manual o dono às vezes lança só o
   * valor; aqui não existe esse caso, e aceitar geraria uma parada sem conteúdo.
   */
  if (!parsed.data.items?.length) {
    return { ok: false, error: 'Escolha ao menos um item.' };
  }

  try {
    const order = await containerFor(establishment.id).useCases.createOrder.execute({
      ...parsed.data,
      source: 'SITE',
      /*
       * O preço vem do catálogo, sempre. O carrinho manda só produto e
       * quantidade — se mandasse valor, bastaria editar a requisição para
       * comprar pizza por um real.
       */
      items: parsed.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    return {
      ok: true,
      trackingUrl: `${env().PUBLIC_BASE_URL.replace(/\/$/, '')}/t/${order.trackingToken.value}`,
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

function parseItens(bruto: FormDataEntryValue | null) {
  if (typeof bruto !== 'string' || !bruto.trim()) return undefined;

  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) && lista.length > 0 ? lista : undefined;
  } catch {
    return undefined;
  }
}
