'use server';

import { Money, precoMinimo } from '@/core';
import { containerFor } from '@/composition-root';
import { Address } from '@/core';
import { estimarPreparo, faixaDePreparo } from '@/core/services/tempo-de-preparo';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { createOrderSchema } from '@/application/dto/schemas';
import { toFormError } from './http/error-mapper';
import { checkRateLimit } from './http/rate-limit';
import { montarEndereco } from './address-parts';
import { cidadePorCoordenada } from '@/infrastructure/geocoding/reverse-city';
import { buscarCep, type EnderecoDoCep } from '@/infrastructure/geocoding/cep';

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
    /** Onde o cliente busca, quando a loja oferece retirada. */
    address: string;
    pickupEnabled: boolean;
    /** Enquadramento inicial do mapa de conferência: a entrega é perto da loja. */
    lat: number | null;
    lng: number | null;
    /** "20 a 30 min", aprendido com a própria cozinha. Nulo sem histórico. */
    preparo: string | null;
  };
  /** Conta Mercado Pago conectada — habilita Pix e cartão online. */
  pixOnlineDisponivel: boolean;
  categorias: Array<{
    nome: string;
    produtos: Array<{
      id: string;
      name: string;
      description: string | null;
      /** O preço-base. Com grupos obrigatórios, o que vale é `precoMinimoCents`. */
      priceCents: number;
      /**
       * O menor total possível — o "a partir de" do cardápio.
       *
       * Numa pizzaria em que o sabor carrega o preço, o produto vale zero e
       * este número é o que o cliente vê. Sem ele, o cartão anunciaria R$ 0,00.
       */
      precoMinimoCents: number;
      imageUrl: string | null;
      grupos: Array<{
        id: string;
        name: string;
        min: number;
        max: number;
        options: Array<{ id: string; name: string; priceCents: number }>;
      }>;
    }>;
  }>;
}

export async function getMenuPublico(slug: string): Promise<MenuPublico | null> {
  const prisma = getPrismaClient(env().DATABASE_URL);

  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      pickupEnabled: true,
      lat: true,
      lng: true,
      deliveryFeeCents: true,
      city: true,
      state: true,
      categoryOrder: true,
    },
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
    /*
     * Posição, e não nome: quem manda na ordem é o dono. A ordem entre
     * categorias vem depois, de `categoryOrder`.
     */
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      category: true,
    },
  });

  /*
   * Os grupos de todos os produtos numa consulta. Buscar por produto seria N+1
   * na tela que o cliente abre — a que menos pode esperar.
   *
   * Opção pausada não vem: ingrediente que acabou não pode ser escolhido, e
   * descobrir isso só na cozinha custa o pedido.
   */
  const vinculos = await prisma.productOptionGroup.findMany({
    /*
     * Filtra pelo dono do grupo, e não só pelos produtos.
     *
     * `ProductOptionGroup` não tem `establishmentId` — quem tem é o grupo. Sem
     * este filtro, um vínculo cruzado gravado por engano ou por má-fé renderiza
     * de verdade nesta tela, que é a que o cliente final vê. O repositório do
     * painel (`forProducts`) já filtrava assim; esta consulta ficou para trás.
     */
    where: {
      productId: { in: produtos.map((p) => p.id) },
      group: { establishmentId: establishment.id },
    },
    orderBy: { position: 'asc' },
    include: {
      group: { include: { options: { where: { active: true }, orderBy: { position: 'asc' } } } },
    },
  });

  const gruposPorProduto = new Map<string, MenuPublico['categorias'][number]['produtos'][number]['grupos']>();
  for (const vinculo of vinculos) {
    const lista = gruposPorProduto.get(vinculo.productId) ?? [];
    lista.push({
      id: vinculo.group.id,
      name: vinculo.group.name,
      min: vinculo.group.min,
      max: vinculo.group.max,
      options: vinculo.group.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceCents: o.priceCents,
      })),
    });
    gruposPorProduto.set(vinculo.productId, lista);
  }

  const preparo = await preparoDaCozinha(prisma, establishment.id);

  const porCategoria = new Map<string, MenuPublico['categorias'][number]['produtos']>();

  for (const produto of produtos) {
    const chave = produto.category ?? 'Outros';
    const atual = porCategoria.get(chave) ?? [];
    const grupos = gruposPorProduto.get(produto.id) ?? [];

    atual.push({
      ...produto,
      grupos,
      precoMinimoCents: precoMinimo(
        Money.fromCents(produto.priceCents),
        grupos.map((g) => ({
          ...g,
          options: g.options.map((o) => ({ ...o, price: Money.fromCents(o.priceCents) })),
        })),
      ).cents,
    });
    porCategoria.set(chave, atual);
  }

  return {
    establishment: {
      name: establishment.name,
      slug: establishment.slug,
      deliveryFeeReais: establishment.deliveryFeeCents / 100,
      address: establishment.address,
      pickupEnabled: establishment.pickupEnabled,
      lat: establishment.lat,
      lng: establishment.lng,
      preparo,
      city: establishment.city ?? '',
      state: establishment.state,
    },
    pixOnlineDisponivel: !!credencial,
    categorias: ordenarCategorias(
      [...porCategoria.entries()].map(([nome, produtos]) => ({ nome, produtos })),
      establishment.categoryOrder,
    ),
  };
}

export type PedidoPublicoResult =
  | { ok: true; modo: 'entrega'; trackingUrl: string; trackingToken: string }
  | {
      ok: true;
      modo: 'pix';
      trackingUrl: string;
      trackingToken: string;
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
      trackingToken: string;
      orderId: string;
      /** Só no fallback Checkout Pro, quando a loja não tem chave pública. */
      checkoutUrl: string | null;
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
  | { ok: true; status: StatusPagamentoOnline; trackingUrl: string; trackingToken: string }
  | { ok: false; error: string };

export type PagamentoPublico = {
  metodo: 'pix' | 'cartao';
  status: StatusPagamentoOnline;
  trackingUrl: string;
  trackingToken: string;
  amountCents: number;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: string | null;
  /**
   * Quando o servidor montou esta tela.
   *
   * O contador não pode comparar o vencimento com o relógio do celular: um
   * telefone atrasado mostra minutos restantes num código que já morreu, e a
   * pessoa paga um QR vencido — o dinheiro sai e volta. Com este instante o
   * navegador mede a diferença e conta pelo relógio de quem manda, que é o
   * mesmo do Mercado Pago.
   */
  servidorEm: string;
  contaTeste: boolean;
  checkoutUrl: string | null;
  /** Chave pública da loja — o Brick do cartão roda no navegador com ela. */
  publicKey: string | null;
};

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
    select: { id: true, address: true, pickupEnabled: true },
  });

  if (!establishment) return { ok: false, error: 'Cardápio não encontrado.' };

  const modoPagamento = modoDoForm(formData.get('modoPagamento'));
  const online = modoPagamento !== 'entrega';

  /*
   * Retirada não pede endereço.
   *
   * O endereço guardado é o da própria loja, porque é onde o pedido é entregue
   * — e porque o resto do sistema (mapa, geocodificação, histórico) espera um
   * endereço válido. O que distingue os dois casos é o `fulfillment`, não o
   * texto do endereço.
   */
  const retirada = formData.get('fulfillment') === 'PICKUP' && establishment.pickupEnabled;

  const pinLat = Number(formData.get('pinLat'));
  const pinLng = Number(formData.get('pinLng'));
  const pinDoCliente =
    Number.isFinite(pinLat) && Number.isFinite(pinLng) && pinLat !== 0 && pinLng !== 0
      ? { lat: pinLat, lng: pinLng }
      : null;

  const rua = String(formData.get('street') ?? '').trim();
  const numero = String(formData.get('number') ?? '').trim();
  const bairro = String(formData.get('neighborhood') ?? '').trim();
  const cidade = String(formData.get('city') ?? '').trim();

  if (!retirada) {
    if (rua.length < 3) return { ok: false, error: 'Informe a rua.' };
    if (!numero) return { ok: false, error: 'Informe o número. Se não tiver, escreva s/n.' };
    if (bairro.length < 2) return { ok: false, error: 'Informe o bairro.' };
    if (cidade.length < 2) return { ok: false, error: 'Informe a cidade.' };
  }

  const parsed = createOrderSchema.safeParse({
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    address: retirada
      ? establishment.address
      : montarEndereco({ rua, numero, bairro, cidade }),
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

  let credencialMp: { liveMode: boolean | null; publicKey: string | null } | null = null;

  if (online) {
    credencialMp = await prisma.integrationCredential.findUnique({
      where: {
        establishmentId_provider: {
          establishmentId: establishment.id,
          provider: 'MERCADO_PAGO',
        },
      },
      select: { liveMode: true, publicKey: true },
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
      fulfillment: retirada ? ('PICKUP' as const) : ('DELIVERY' as const),
      /*
       * O pino que o cliente marcou vence a busca automática — ele só marcou
       * porque ela falhou, e quem mora ali sabe onde fica.
       */
      pin: pinDoCliente,
      paymentStatus: online ? 'PENDING' : null,
      city: cidade,
      items: parsed.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        options: item.options,
      })),
    });

    const baseUrl = env().PUBLIC_BASE_URL.replace(/\/$/, '');
    const trackingToken = order.trackingToken.value;
    const trackingUrl = `${baseUrl}/t/${trackingToken}`;

    if (modoPagamento === 'entrega') {
      return { ok: true, modo: 'entrega', trackingUrl, trackingToken };
    }

    const establishmentRow = await prisma.establishment.findUnique({
      where: { id: establishment.id },
      select: { name: true },
    });
    const nomeLoja = establishmentRow?.name ?? 'Pedido';
    const basePagamento = `${baseUrl}/cardapio/${slug}/pagamento?pedido=${order.id}`;

    if (modoPagamento === 'cartao_online') {
      if (credencialMp?.publicKey) {
        return {
          ok: true,
          modo: 'cartao',
          trackingUrl,
          trackingToken,
          orderId: order.id,
          checkoutUrl: null,
        };
      }

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
        trackingToken,
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
      trackingToken,
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
    const trackingToken = order.trackingToken.value;
    const trackingUrl = `${baseUrl}/t/${trackingToken}`;

    if (payment.status === 'PAID' || order.paymentStatus === 'PAID') {
      if (!forcarConsulta) return { ok: true, status: 'PAID', trackingUrl, trackingToken };
    }

    if (
      payment.status === 'REJECTED'
      || payment.status === 'EXPIRED'
      || payment.status === 'CHARGED_BACK'
      || payment.status === 'REFUNDED'
    ) {
      if (!forcarConsulta) {
        return { ok: true, status: payment.status, trackingUrl, trackingToken };
      }
    }

    const now = Date.now();
    if (!payment.isPending(new Date(now)) && payment.status !== 'PAID') {
      return {
        ok: true,
        status: payment.status === 'EXPIRED' ? 'EXPIRED' : payment.status,
        trackingUrl,
        trackingToken,
      };
    }

    if (forcarConsulta) {
      const remoto = await container.useCases.confirmPayment.execute({
        externalId: paymentId || payment.externalId,
      });
      return { ok: true, status: remoto, trackingUrl, trackingToken };
    }

    return {
      ok: true,
      status: payment.status === 'IN_REVIEW' ? 'IN_REVIEW' : 'PENDING',
      trackingUrl,
      trackingToken,
    };
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

export async function getPagamentoPublico(
  slug: string,
  orderId: string,
): Promise<PagamentoPublico | null> {
  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!establishment) return null;

  const credencial = await prisma.integrationCredential.findUnique({
    where: {
      establishmentId_provider: {
        establishmentId: establishment.id,
        provider: 'MERCADO_PAGO',
      },
    },
    select: { liveMode: true, publicKey: true },
  });

  const container = containerFor(establishment.id);
  const payment = await container.read((repos) => repos.payments.findByOrderId(orderId));
  const order = await container.read((repos) => repos.orders.findById(orderId));
  if (!order) return null;
  if (order.paymentStatus === null && !payment) return null;

  const trackingToken = order.trackingToken.value;
  const status: StatusPagamentoOnline =
    payment?.status === 'PAID' || order.paymentStatus === 'PAID'
      ? 'PAID'
      : payment?.status === 'IN_REVIEW' || order.paymentStatus === 'IN_REVIEW'
        ? 'IN_REVIEW'
        : payment && !payment.isPending(new Date())
          ? payment.status
          : 'PENDING';

  return {
    metodo: payment?.qrCode ? 'pix' : 'cartao',
    status,
    trackingUrl: `${env().PUBLIC_BASE_URL.replace(/\/$/, '')}/t/${trackingToken}`,
    trackingToken,
    amountCents: payment?.amountCents ?? order.amount.cents,
    qrCode: payment?.qrCode ?? null,
    qrCodeBase64: payment?.qrCodeBase64 ?? null,
    expiresAt: payment?.expiresAt?.toISOString() ?? null,
    servidorEm: new Date().toISOString(),
    contaTeste: credencial?.liveMode === false,
    checkoutUrl: payment?.checkoutUrl ?? null,
    publicKey: credencial?.publicKey ?? null,
  };
}

export type DadosCartaoBrick = {
  token: string;
  issuer_id?: string | number;
  payment_method_id: string;
  installments: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

export async function pagarCartaoAction(
  slug: string,
  orderId: string,
  dados: DadosCartaoBrick,
): Promise<ConsultaPagamentoResult> {
  const limite = checkRateLimit(`card:${slug}`, { max: 20, windowMs: 60_000 });
  if (!limite.allowed) {
    return { ok: false, error: 'Muitas tentativas. Espere um instante e tente de novo.' };
  }

  const token = dados.token?.trim() ?? '';
  const paymentMethodId = dados.payment_method_id?.trim() ?? '';
  const installments = Number(dados.installments);

  if (token.length < 10) return { ok: false, error: 'Cartão inválido. Confira os dados e tente de novo.' };
  if (!paymentMethodId) return { ok: false, error: 'Não identificamos a bandeira do cartão.' };
  if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
    return { ok: false, error: 'Número de parcelas inválido.' };
  }

  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!establishment) return { ok: false, error: 'Cardápio não encontrado.' };

  const credencial = await prisma.integrationCredential.findUnique({
    where: {
      establishmentId_provider: {
        establishmentId: establishment.id,
        provider: 'MERCADO_PAGO',
      },
    },
    select: { liveMode: true },
  });

  try {
    const container = containerFor(establishment.id);
    const order = await container.read((repos) => repos.orders.findById(orderId));
    if (!order) return { ok: false, error: 'Pedido não encontrado.' };

    const identification =
      dados.payer?.identification?.type && dados.payer.identification.number
        ? {
            type: dados.payer.identification.type,
            number: dados.payer.identification.number.replace(/\D/g, ''),
          }
        : undefined;

    const payment = await container.useCases.createPayment.execute({
      orderId,
      method: 'card',
      payerEmail: dados.payer?.email || emailPixDoCliente(
        orderId,
        order.customerPhone?.value,
        credencial?.liveMode === false,
      ),
      sandbox: credencial?.liveMode === false,
      description: `Pedido em ${slug}`,
      card: {
        token,
        installments,
        paymentMethodId,
        issuerId: dados.issuer_id != null ? String(dados.issuer_id) : undefined,
        identification,
      },
    });

    const status =
      payment.status === 'PAID' || payment.status === 'REJECTED' || payment.status === 'IN_REVIEW'
        ? payment.status
        : await container.useCases.confirmPayment.execute({
            externalId: payment.externalId,
          });

    const baseUrl = env().PUBLIC_BASE_URL.replace(/\/$/, '');
    return {
      ok: true,
      status,
      trackingUrl: `${baseUrl}/t/${order.trackingToken.value}`,
      trackingToken: order.trackingToken.value,
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Endereço a partir do CEP.
 *
 * Roda no servidor por dois motivos: mantém a dependência externa do nosso
 * lado, onde dá para trocar de provedor sem tocar na tela, e passa pelo mesmo
 * limite de taxa do resto do cardápio público.
 */
export async function buscarCepAction(
  cep: string,
): Promise<{ ok: true; endereco: EnderecoDoCep } | { ok: false }> {
  const limite = checkRateLimit('geo:cep', { max: 40, windowMs: 60_000 });
  if (!limite.allowed) return { ok: false };

  const endereco = await buscarCep(cep);
  return endereco ? { ok: true, endereco } : { ok: false };
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

/**
 * Emite um código Pix novo para um pedido cujo código venceu.
 *
 * Antes disto a tela mandava o cliente refazer o pedido — e, pior, continuava
 * exibindo o QR vencido, que o banco lê normalmente. O dinheiro saía e voltava
 * uns dois minutos depois, sem gerar pagamento nenhum do lado de cá.
 */
export async function renovarPixAction(
  slug: string,
  orderId: string,
): Promise<
  | {
      ok: true;
      qrCode: string;
      qrCodeBase64: string | null;
      expiresAt: string;
      servidorEm: string;
    }
  | { ok: false; error: string }
> {
  const limite = checkRateLimit(`pix:renovar:${orderId}`, { max: 6, windowMs: 60_000 });
  if (!limite.allowed) {
    return { ok: false, error: 'Muitas tentativas seguidas. Espere um instante.' };
  }

  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!establishment) return { ok: false, error: 'Cardápio não encontrado.' };

  try {
    const container = containerFor(establishment.id);
    const order = await container.read((repos) => repos.orders.findById(orderId));
    if (!order) return { ok: false, error: 'Pedido não encontrado.' };

    const credencial = await prisma.integrationCredential.findUnique({
      where: {
        establishmentId_provider: { establishmentId: establishment.id, provider: 'MERCADO_PAGO' },
      },
      select: { liveMode: true },
    });
    const sandbox = credencial?.liveMode === false;

    const payment = await container.useCases.createPayment.execute({
      orderId,
      payerEmail: emailPixDoCliente(orderId, order.customerPhone?.value, sandbox),
      sandbox,
    });

    if (!payment.qrCode || !payment.expiresAt) {
      return { ok: false, error: 'Não foi possível gerar um código novo. Tente de novo.' };
    }

    return {
      ok: true,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      expiresAt: payment.expiresAt.toISOString(),
      servidorEm: new Date().toISOString(),
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Onde fica este endereço, para o cliente conferir antes de enviar.
 *
 * O geocodificador falha por coisas fora do alcance de quem pede: rua nova, ou
 * uma letra de diferença — "Resende" e "Rezende" são a mesma rua para gente e
 * duas para o mapa. Quando ele falha, quem sabe onde mora é o cliente, e ele
 * está com o telefone na mão AGORA. Descobrir isso depois, no painel, é o dono
 * ligando para perguntar onde é.
 */
export async function localizarEnderecoAction(
  slug: string,
  endereco: string,
): Promise<{ ok: true; lat: number; lng: number } | { ok: false }> {
  const limite = checkRateLimit(`geo:publico:${slug}`, { max: 30, windowMs: 60_000 });
  if (!limite.allowed) return { ok: false };

  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishment = await prisma.establishment.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!establishment) return { ok: false };

  try {
    const container = containerFor(establishment.id);
    const loja = await container.read((repos) => repos.establishments.current());

    const achado = await container.geocoder
      .geocode(Address.create(endereco), { city: loja.city, state: loja.state })
      .catch(() => null);

    if (!achado) return { ok: false };

    const { lat, lng } = achado.toJSON();
    return { ok: true, lat, lng };
  } catch {
    return { ok: false };
  }
}

/**
 * Quanto a cozinha está demorando hoje, para prometer ao cliente.
 *
 * Sai do histórico do próprio estabelecimento, e leva em conta o que já está no
 * fogo agora: prometer o tempo típico com a cozinha cheia é como se cria cliente
 * irritado — ele não compara com a média do mês, compara com o que ouviu quando
 * pediu.
 */
async function preparoDaCozinha(
  prisma: ReturnType<typeof getPrismaClient>,
  establishmentId: string,
): Promise<string | null> {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60_000);

  const [prontos, naFila] = await Promise.all([
    prisma.order.findMany({
      where: { establishmentId, readyAt: { not: null }, createdAt: { gte: desde } },
      /*
       * Teto de 400: trinta dias de uma pizzaria movimentada passam disso, e a
       * mediana não fica mais verdadeira com mil amostras do que com
       * quatrocentas — só mais cara.
       */
      take: 400,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, readyAt: true },
    }),
    prisma.order.count({ where: { establishmentId, status: 'NEW' } }),
  ]);

  const estimativa = estimarPreparo({
    amostrasMinutos: prontos.map(
      (o: { createdAt: Date; readyAt: Date | null }) =>
        (o.readyAt!.getTime() - o.createdAt.getTime()) / 60_000,
    ),
    naFila,
    padraoMinutos: 40,
  });

  /*
   * Sem histórico, não promete nada.
   *
   * Um número inventado na primeira semana da loja é pior que silêncio: ele vira
   * a referência que o cliente cobra, e a cozinha ainda nem sabe o próprio ritmo.
   */
  if (estimativa.base === 'PADRAO') return null;

  return faixaDePreparo(estimativa.minutos);
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

/**
 * Põe as categorias na ordem que o dono escolheu.
 *
 * Quem não está na lista vai para o fim, em ordem alfabética: categoria criada
 * agora aparece no cardápio na hora, só não passa na frente de quem já foi
 * posicionado. O contrário — sumir até alguém ordenar — esconderia produto que
 * está à venda.
 */
/*
 * Sem `export`: este arquivo é 'use server', e ali todo export precisa ser
 * função assíncrona — o Next trata cada um como uma ação chamável pelo
 * navegador. Auxiliar de ordenação não é ação de ninguém.
 */
function ordenarCategorias<T extends { nome: string }>(
  categorias: T[],
  ordem: string[],
): T[] {
  const posicao = new Map(ordem.map((nome, i) => [nome, i]));
  return [...categorias].sort((a, b) => {
    const pa = posicao.get(a.nome) ?? Number.MAX_SAFE_INTEGER;
    const pb = posicao.get(b.nome) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
