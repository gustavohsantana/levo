import type { FontesDaLoja } from '../resolver-loja';
import type { CategoriaDoRetrato, Retrato } from './motor';
import type { Resolucao } from '../resolver-loja';
import { aPartirDe, type ProdutoDoRetrato } from './pedido';

/**
 * O que o atendimento precisa do banco.
 *
 * Fica separado do orquestrador pelo mesmo motivo de sempre neste projeto: o
 * que decide comportamento é testado sem banco. Aqui mora só a tradução entre
 * tabela e os tipos que o motor entende.
 */

/** O mínimo do Prisma que este módulo usa. */
interface Cliente {
  whatsappChannel: { findUnique(a: unknown): Promise<ChannelRow | null> };
  whatsappConversation: {
    findUnique(a: unknown): Promise<ConversaRow | null>;
    findMany(a: unknown): Promise<ConversaRow[]>;
    upsert(a: unknown): Promise<unknown>;
  };
  establishment: {
    findUnique(a: unknown): Promise<LojaRow | null>;
    findMany(a: unknown): Promise<LojaRow[]>;
  };
  order: { findMany(a: unknown): Promise<PedidoRow[]> };
  product: {
    findMany(a: unknown): Promise<ProdutoRow[]>;
  };
}

interface ChannelRow { id: string; establishmentId: string | null; active: boolean }
interface ConversaRow { id: string; establishmentId: string; resolvedAt: Date; estado: unknown }
interface LojaRow { id: string; name: string; slug: string | null }
interface PedidoRow { id: string; displayId: string | null; establishmentId: string; status: string; readyAt: Date | null }
interface ProdutoRow {
  id: string;
  name: string;
  category: string | null;
  priceCents: number;
  establishmentId: string;
  optionGroups?: {
    position: number;
    group: {
      id: string;
      name: string;
      min: number;
      max: number;
      options: { id: string; name: string; priceCents: number; active: boolean; position: number }[];
    };
  }[];
}

/** As fontes que o resolvedor de loja consulta. */
export function fontesDaLoja(prisma: Cliente): FontesDaLoja {
  return {
    async canalPorNumero(phoneNumberId) {
      const row = await prisma.whatsappChannel.findUnique({ where: { phoneNumberId } });
      return row ? { id: row.id, establishmentId: row.establishmentId, active: row.active } : null;
    },

    async lojaPorCodigo(codigo) {
      const loja = await prisma.establishment.findUnique({ where: { slug: codigo } });
      return loja?.id ?? null;
    },

    async historico(channelId, customerPhone) {
      /*
       * O histórico vem das conversas deste canal, da mais recente para a mais
       * antiga — é o que o resolvedor usa para perguntar "onde você quer pedir
       * hoje?" listando SÓ as lojas que o próprio cliente escolheu um dia.
       */
      const linhas = await prisma.whatsappConversation.findMany({
        where: { customerPhone },
        orderBy: { resolvedAt: 'desc' },
        take: 5,
      });
      return linhas.map((l) => ({ establishmentId: l.establishmentId, resolvedAt: l.resolvedAt }));
    },

    async lembrar(channelId, customerPhone, establishmentId) {
      await prisma.whatsappConversation.upsert({
        where: { channelId_customerPhone: { channelId, customerPhone } },
        create: { channelId, customerPhone, establishmentId },
        update: { establishmentId, resolvedAt: new Date() },
      });
    },
  };
}

/**
 * O retrato do mundo para uma mensagem.
 *
 * Carrega só as lojas que entram na conversa — a do foco e as do histórico.
 * Trazer todas seria vazamento: o motor tem a regra de nunca apresentar loja
 * que o cliente não escolheu, e a melhor forma de garantir isso é ele não ter
 * as outras em mãos.
 */
export async function montarRetrato(
  prisma: Cliente,
  resolucao: Resolucao,
  agora: Date,
): Promise<Retrato> {
  const ids = new Set<string>();
  if (resolucao.tipo === 'loja') ids.add(resolucao.establishmentId);
  if (resolucao.tipo === 'escolher') resolucao.opcoes.forEach((o) => ids.add(o.establishmentId));

  if (ids.size === 0) {
    return { agora, resolucao, nomeDaLoja: {}, slugDaLoja: {}, pedidosEmAndamento: [] };
  }

  const lojas = await prisma.establishment.findMany({ where: { id: { in: [...ids] } } });

  const nomeDaLoja: Record<string, string> = {};
  const slugDaLoja: Record<string, string> = {};
  for (const l of lojas) {
    nomeDaLoja[l.id] = l.name;
    // Loja sem slug não tem cardápio público; o `id` serve de chave para o
    // toque continuar funcionando, mesmo sem link publicável.
    slugDaLoja[l.id] = l.slug ?? l.id;
  }

  /*
   * O menu clicável do motor precisa disto. Os grupos de opção vêm junto
   * porque a montagem do açaí (tamanho, base, frutas) é do motor — carregar
   * só o nome deixava o preço e a escolha no colo do modelo.
   */
  const categorias = await categoriasDaLoja(prisma, [...ids]);

  return {
    agora,
    resolucao,
    nomeDaLoja,
    slugDaLoja,
    pedidosEmAndamento: [],
    ...(categorias.length > 0 ? { categorias } : {}),
  };
}

/**
 * Os pedidos do cliente que ainda não terminaram, de TODAS as lojas dele.
 *
 * Juntos de propósito: quem escreve "oi" com pizza a caminho está perguntando
 * da pizza, não pedindo cardápio. E os dois aparecem carimbados, para nenhuma
 * loja ficar escondida atrás da outra na conversa compartilhada.
 */
export async function pedidosEmAndamento(
  prisma: Cliente,
  telefone: string,
  lojas: string[],
): Promise<Retrato['pedidosEmAndamento']> {
  if (lojas.length === 0) return [];

  const linhas = await prisma.order.findMany({
    where: {
      establishmentId: { in: lojas },
      status: { in: ['NEW', 'IN_ROUTE'] },
      customerPhone: { contains: telefone.slice(-8) },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  return linhas.map((p) => ({
    id: p.id,
    displayId: p.displayId,
    lojaId: p.establishmentId,
    situacao: situacao(p),
  }));
}

/**
 * O cardápio reduzido a nomes, para o menu clicável.
 *
 * Só da loja em foco — misturar duas lojas na mesma lista seria mostrar o
 * concorrente, que é exatamente a regra que o motor existe para impedir.
 */
async function categoriasDaLoja(prisma: Cliente, ids: string[]): Promise<CategoriaDoRetrato[]> {
  if (ids.length !== 1) return [];

  const produtos = await prisma.product.findMany({
    where: { establishmentId: ids[0], active: true },
    include: {
      optionGroups: {
        orderBy: { position: 'asc' },
        include: {
          group: {
            include: {
              options: { where: { active: true }, orderBy: { position: 'asc' } },
            },
          },
        },
      },
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });

  const porNome = new Map<string, ProdutoDoRetrato[]>();
  for (const p of produtos) {
    const grupos = (p.optionGroups ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((pog) => ({
        id: pog.group.id,
        nome: pog.group.name,
        min: pog.group.min,
        max: pog.group.max,
        opcoes: pog.group.options
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((o) => ({ id: o.id, nome: o.name, priceCents: o.priceCents })),
      }));

    const produto: ProdutoDoRetrato = {
      id: p.id,
      nome: p.name,
      priceCents: p.priceCents,
      grupos,
      aPartirDeCents: aPartirDe({ priceCents: p.priceCents, grupos }),
    };

    const nome = p.category?.trim() || 'Cardápio';
    const lista = porNome.get(nome) ?? [];
    lista.push(produto);
    porNome.set(nome, lista);
  }

  return [...porNome.entries()].map(([nome, lista]) => ({ nome, produtos: lista }));
}

/** O estado do pedido em palavras que o cliente entende. */
function situacao(p: PedidoRow): string {
  if (p.status === 'IN_ROUTE') return 'saiu para entrega';
  return p.readyAt ? 'pronto, aguardando o entregador' : 'em preparo';
}

export async function lerConversa(
  prisma: Cliente,
  channelId: string,
  customerPhone: string,
): Promise<unknown> {
  const row = await prisma.whatsappConversation.findUnique({
    where: { channelId_customerPhone: { channelId, customerPhone } },
  });
  return row?.estado ?? null;
}

export async function gravarConversa(
  prisma: Cliente,
  channelId: string,
  customerPhone: string,
  establishmentId: string,
  estado: unknown,
): Promise<void> {
  await prisma.whatsappConversation.upsert({
    where: { channelId_customerPhone: { channelId, customerPhone } },
    create: { channelId, customerPhone, establishmentId, estado: estado as object },
    update: { establishmentId, estado: estado as object, resolvedAt: new Date() },
  });
}
