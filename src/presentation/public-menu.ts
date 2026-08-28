'use server';

import { containerFor } from '@/composition-root';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { createOrderSchema } from '@/application/dto/schemas';
import { toFormError } from './http/error-mapper';
import { checkRateLimit } from './http/rate-limit';
import { montarEndereco } from './address-parts';
import { cidadePorCoordenada } from '@/infrastructure/geocoding/reverse-city';

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
  establishment: {
    name: string;
    slug: string;
    deliveryFeeReais: number;
    city: string;
    state: string | null;
  };
  /** Conta Mercado Pago conectada — habilita Pix e cartão online. */
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
    select: { id: true, name: true, slug: true, deliveryFeeCents: true, city: true, state: true },
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
      city: establishment.city ?? '',
      state: establishment.state,
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
      contaTeste: boolean;
      ticketUrl: string | null;
    }
  | {
      ok: true;
      modo: 'cartao';
      trackingUrl: string;
      orderId: string;
      checkoutUrl: string;
    }
  | { ok: false; error: string };

export type StatusPagamentoOnline =
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'REJECTED'
  | 'IN_REVIEW'
  | 'REFUNDED'
  | 'CHARGED_BACK'
  | 'CANCELLED';

export type ConsultaPagamentoResult =
  | { ok: true; status: StatusPagamentoOnline; trackingUrl: string }
  | { ok: false; error: string };

function modoDoForm(valor: FormDataEntryValue | null): 'entrega' | 'pix_online' | 'cartao_online' {
  if (valor === 'pix_online' || valor === 'cartao_online') return valor;
  return 'entrega';
}

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

  const modoPagamento = modoDoForm(formData.get('modoPagamento'));
  const online = modoPagamento !== 'entrega';

  const rua = String(formData.get('street') ?? '').trim();
  const numero = String(formData.get('number') ?? '').trim();
  const bairro = String(formData.get('neighborhood') ?? '').trim();
  const cidade = String(formData.get('city') ?? '').trim();

  if (rua.length < 3) return { ok: false, error: 'Informe a rua.' };
  if (!numero) return { ok: false, error: 'Informe o número. Se não tiver, escreva s/n.' };
  if (bairro.length < 2) return { ok: false, error: 'Informe o bairro.' };
  if (cidade.length < 2) return { ok: false, error: 'Informe a cidade.' };

  const parsed = createOrderSchema.safeParse({
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    address: montarEndereco({ rua, numero, bairro, cidade }),
    reference: formData.get('reference'),
    amountReais: 0,
    notes: formData.get('notes'),
    items: parseItens(formData.get('items')),
    paymentMethod:
      online
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

  if (online) {
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
      return {
        ok: false,
        error: 'Pagamento online indisponível nesta loja. Escolha pagar na entrega.',
      };
    }
  }

  try {
    const container = containerFor(establishment.id);
    const order = await container.useCases.createOrder.execute({
      ...parsed.data,
      source: 'SITE',
      paymentStatus: online ? 'PENDING' : null,
      city: cidade,
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

    const establishmentRow = await prisma.establishment.findUnique({
      where: { id: establishment.id },
      select: { name: true },
    });
    const nomeLoja = establishmentRow?.name ?? 'Pedido';
    const basePagamento = `${baseUrl}/cardapio/${slug}/pagamento?pedido=${order.id}`;

    if (modoPagamento === 'cartao_online') {
      const payment = await container.useCases.createPayment.execute({
        orderId: order.id,
        method: 'card',
        payerEmail: emailPixDoCliente(
          order.id,
          parsed.data.customerPhone,
          credencialMp?.liveMode === false,
        ),
        sandbox: credencialMp?.liveMode === false,
        description: `Pedido em ${nomeLoja}`,
        statementDescriptor: nomeLoja,
        backUrl: basePagamento,
      });

      if (!payment.checkoutUrl) {
        return { ok: false, error: 'Não foi possível abrir o pagamento no cartão. Tente de novo.' };
      }

      return {
        ok: true,
        modo: 'cartao',
        trackingUrl,
        orderId: order.id,
        checkoutUrl: payment.checkoutUrl,
      };
    }

    const payment = await container.useCases.createPayment.execute({
      orderId: order.id,
      payerEmail: emailPixDoCliente(
        order.id,
        parsed.data.customerPhone,
        credencialMp?.liveMode === false,
      ),
      sandbox: credencialMp?.liveMode === false,
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
      contaTeste: credencialMp?.liveMode === false,
      ticketUrl: payment.ticketUrl,
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function consultarPagamentoAction(
  slug: string,
  orderId: string,
  forcarConsulta = false,
  paymentId?: string | null,
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
      if (!forcarConsulta) return { ok: true, status: 'PAID', trackingUrl };
    }

    if (
      payment.status === 'REJECTED'
      || payment.status === 'EXPIRED'
      || payment.status === 'CHARGED_BACK'
      || payment.status === 'REFUNDED'
    ) {
      if (!forcarConsulta) {
        return { ok: true, status: payment.status, trackingUrl };
      }
    }

    const now = Date.now();
    if (!payment.isPending(new Date(now)) && payment.status !== 'PAID') {
      return { ok: true, status: payment.status === 'EXPIRED' ? 'EXPIRED' : payment.status, trackingUrl };
    }

    if (forcarConsulta) {
      const remoto = await container.useCases.confirmPayment.execute({
        externalId: paymentId || payment.externalId,
      });
      return { ok: true, status: remoto, trackingUrl };
    }

    return { ok: true, status: payment.status === 'IN_REVIEW' ? 'IN_REVIEW' : 'PENDING', trackingUrl };
  } catch (cause) {
    const mensagem = toFormError(cause);
    if (/mercadolibre|resource not found|consultar o pagamento/i.test(mensagem)) {
      return {
        ok: false,
        error:
          'Ainda não identificamos o pagamento. Confira no banco e tente de novo em alguns segundos.',
      };
    }
    return { ok: false, error: mensagem };
  }
}

export async function sugerirCidadeAction(
  lat: number,
  lng: number,
): Promise<{ ok: true; cidade: string } | { ok: false }> {
  const limite = checkRateLimit('geo:cidade', { max: 30, windowMs: 60_000 });
  if (!limite.allowed) return { ok: false };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false };

  try {
    const cidade = await cidadePorCoordenada(lat, lng);
    if (!cidade) return { ok: false };
    return { ok: true, cidade };
  } catch {
    return { ok: false };
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
