import { Money, precoMinimo } from '@/core';
import { estimarPreparo, faixaDePreparo } from '@/core/services/tempo-de-preparo';
import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';

/**
 * O cardápio que o cliente vê, carregado do banco.
 *
 * Mora na infraestrutura porque o site e o WhatsApp precisam da mesma lista:
 * produto, preço mínimo e taxa. Se cada um consultasse do seu jeito, o chat
 * cobraria um valor e a tela outro.
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

export async function carregarMenuPublico(slug: string): Promise<MenuPublico | null> {
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

  const gruposPorProduto = new Map<
    string,
    MenuPublico['categorias'][number]['produtos'][number]['grupos']
  >();
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
      [...porCategoria.entries()].map(([nome, produtosDaCategoria]) => ({
        nome,
        produtos: produtosDaCategoria,
      })),
      establishment.categoryOrder,
    ),
  };
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

/**
 * Põe as categorias na ordem que o dono escolheu.
 *
 * Quem não está na lista vai para o fim, em ordem alfabética: categoria criada
 * agora aparece no cardápio na hora, só não passa na frente de quem já foi
 * posicionado. O contrário — sumir até alguém ordenar — esconderia produto que
 * está à venda.
 */
function ordenarCategorias<T extends { nome: string }>(categorias: T[], ordem: string[]): T[] {
  const posicao = new Map(ordem.map((nome, i) => [nome, i]));
  return [...categorias].sort((a, b) => {
    const pa = posicao.get(a.nome) ?? Number.MAX_SAFE_INTEGER;
    const pb = posicao.get(b.nome) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
