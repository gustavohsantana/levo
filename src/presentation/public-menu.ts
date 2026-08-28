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
  /** Conta Mercado Pago conectada — habilita "Pagar agora (Pix)". */
  pixOnlineDisponivel: boolean;
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

  const credencial = await prisma.integrationCredential.findUnique({
    where: {
      establishmentId_provider: {
        establishmentId: establishment.id,
        provider: 'MERCADO_PAGO',
      },
    },
    select: { id: true },
  });

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
    pixOnlineDisponivel: !!credencial,
    categorias: [...porCategoria.entries()].map(([nome, produtos]) => ({ nome, produtos })),
  };
}

export type PedidoPublicoResult =
  | { ok: true; modo: 'entrega'; trackingUrl: string }
  | {
      ok: true;
      modo: 'pix';
      trackingUrl: string;
      orderId: string;
      qrCode: string;
      qrCodeBase64: string | null;
      expiresAt: string;
      amountCents: number;
    }
  | { ok: false; error: string };

export type ConsultaPagamentoResult =
  | { ok: true; status: 'PENDING' | 'PAID' | 'EXPIRED'; trackingUrl: string }
  | { ok: false; error: string };

export async function criarPedidoPublicoAction(
  slug: string,
  formData: FormData,
): Promise<PedidoPublicoResult> {
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

  const modoPagamento = formData.get('modoPagamento') === 'pix_online' ? 'pix_online' : 'entrega';

  const parsed = createOrderSchema.safeParse({
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    address: formData.get('address'),
    reference: formData.get('reference'),
    amountReais: 0,
    notes: formData.get('notes'),
    items: parseItens(formData.get('items')),
    paymentMethod:
      modoPagamento === 'pix_online'
        ? 'ONLINE'
        : (formData.get('paymentMethod') as string) || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  if (!parsed.data.items?.length) {
    return { ok: false, error: 'Escolha ao menos um item.' };
  }

  let credencialMp: { liveMode: boolean | null } | null = null;

  if (modoPagamento === 'pix_online') {
    credencialMp = await prisma.integrationCredential.findUnique({
      where: {
        establishmentId_provider: {
          establishmentId: establishment.id,
          provider: 'MERCADO_PAGO',
        },
      },
      select: { liveMode: true },
    });

    if (!credencialMp) {
      return { ok: false, error: 'Pix online indisponível nesta loja. Escolha pagar na entrega.' };
    }
  }

  try {
    const container = containerFor(establishment.id);
    const order = await container.useCases.createOrder.execute({
      ...parsed.data,
      source: 'SITE',
      paymentStatus: modoPagamento === 'pix_online' ? 'PENDING' : null,
      items: parsed.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    const baseUrl = env().PUBLIC_BASE_URL.replace(/\/$/, '');
    const trackingUrl = `${baseUrl}/t/${order.trackingToken.value}`;

    if (modoPagamento === 'entrega') {
      return { ok: true, modo: 'entrega', trackingUrl };
    }

    const payment = await container.useCases.createPayment.execute({
      orderId: order.id,
      payerEmail: emailPixDoCliente(
        order.id,
        parsed.data.customerPhone,
        credencialMp?.liveMode === false,
      ),
    });

    return {
      ok: true,
      modo: 'pix',
      trackingUrl,
      orderId: order.id,
      qrCode: payment.qrCode ?? '',
      qrCodeBase64: payment.qrCodeBase64,
      expiresAt: payment.expiresAt?.toISOString() ?? new Date().toISOString(),
      amountCents: payment.amountCents,
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function consultarPagamentoAction(
  slug: string,
  orderId: string,
  forcarConsulta = false,
): Promise<ConsultaPagamentoResult> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!establishment) return { ok: false, error: 'Cardápio não encontrado.' };

  try {
    const container = containerFor(establishment.id);
    const payment = await container.read((repos) => repos.payments.findByOrderId(orderId));

    if (!payment) return { ok: false, error: 'Pagamento não encontrado.' };

    const order = await container.read((repos) => repos.orders.findById(orderId));
    if (!order) return { ok: false, error: 'Pedido não encontrado.' };

    const baseUrl = env().PUBLIC_BASE_URL.replace(/\/$/, '');
    const trackingUrl = `${baseUrl}/t/${order.trackingToken.value}`;

    if (payment.status === 'PAID' || order.paymentStatus === 'PAID') {
      return { ok: true, status: 'PAID', trackingUrl };
    }

    const now = Date.now();
    if (!payment.isPending(new Date(now))) {
      return { ok: true, status: 'EXPIRED', trackingUrl };
    }

    if (forcarConsulta) {
      const remoto = await container.useCases.confirmPayment.execute({
        externalId: payment.externalId,
      });
      return { ok: true, status: remoto, trackingUrl };
    }

    return { ok: true, status: 'PENDING', trackingUrl };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

function emailPixDoCliente(
  orderId: string,
  telefone?: string | null,
  sandbox = false,
): string {
  const digits = (telefone ?? '').replace(/\D/g, '').slice(-8) || orderId.slice(0, 8);
  /*
   * Sandbox do Mercado Pago recusa qualquer e-mail que não seja @testuser.com.
   * Produção aceita domínio real; o endereço não precisa existir de verdade.
   */
  if (sandbox) return `test_user_${digits}@testuser.com`;
  return `cliente+${digits}@levoentregas.app`;
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
