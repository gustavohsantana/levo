import 'server-only';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { env } from '@/env';
import { requireSession } from './http/session';
import {
  consolidar,
  fimDoDia,
  inicioDoDia,
  type FiltroRelatorio,
  type LinhaRelatorio,
  type Plataforma,
  type Relatorio,
} from './reports-core';

export * from './reports-core';

/**
 * O relatório do dono: o que saiu, por onde, com quem.
 *
 * Existe porque o painel de pedidos responde "o que está acontecendo agora" e
 * some com o que já foi. Quem toca o negócio precisa da outra pergunta — quanto
 * saiu esta semana, qual plataforma trouxe mais, quem entregou o quê — e hoje
 * ela só teria resposta abrindo o banco.
 */

/**
 * Teto da tabela detalhada.
 *
 * Os totais somam o período inteiro; a lista mostra as mais recentes. Uma
 * tabela de cinco mil linhas não é controle, é uma página que não abre no
 * celular — e quem precisa de tudo exporta.
 */
const LIMITE_DE_LINHAS = 300;

export async function getRelatorio(filtro: FiltroRelatorio): Promise<Relatorio> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishmentId = session.establishmentId;

  const pedidos = await prisma.order.findMany({
    where: {
      establishmentId,
      createdAt: { gte: inicioDoDia(filtro.de), lt: fimDoDia(filtro.ate) },
      ...(filtro.plataforma ? { source: filtro.plataforma } : {}),
      ...(filtro.status === 'EM_ABERTO'
        ? { status: { in: ['NEW', 'IN_ROUTE'] } }
        : filtro.status
          ? { status: filtro.status }
          : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      deliveredAt: true,
      displayId: true,
      source: true,
      status: true,
      customerName: true,
      address: true,
      amountCents: true,
      deliveryFeeCents: true,
      routeId: true,
    },
  });

  /*
   * Quem entregou sai da rota, não do pedido: o pedido guarda `routeId`, e a
   * rota é de um motoboy. Uma consulta para todas as rotas do período em vez de
   * uma por pedido.
   */
  const rotaIds = [...new Set(pedidos.map((p) => p.routeId).filter((x): x is string => !!x))];
  const rotas = rotaIds.length
    ? await prisma.route.findMany({
        where: { establishmentId, id: { in: rotaIds } },
        select: { id: true, courierId: true, courier: { select: { name: true } } },
      })
    : [];
  const porRota = new Map(rotas.map((r) => [r.id, { id: r.courierId, nome: r.courier.name }]));

  const entregadores = await prisma.courier.findMany({
    where: { establishmentId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // O filtro por entregador é aplicado aqui porque ele mora na rota, não no
  // pedido — levá-lo para o `where` exigiria um join que o Prisma só faz por
  // relação, e a relação existe do outro lado.
  const doFiltro = filtro.entregadorId
    ? pedidos.filter((p) => (p.routeId ? porRota.get(p.routeId)?.id : null) === filtro.entregadorId)
    : pedidos;

  const linhas: LinhaRelatorio[] = doFiltro.map((p) => {
    const entregador = p.routeId ? (porRota.get(p.routeId)?.nome ?? null) : null;
    const minutos =
      p.deliveredAt != null
        ? Math.round((p.deliveredAt.getTime() - p.createdAt.getTime()) / 60_000)
        : null;

    return {
      id: p.id,
      quando: p.createdAt.toISOString(),
      displayId: p.displayId,
      plataforma: p.source as Plataforma,
      cliente: p.customerName,
      endereco: p.address,
      entregador,
      totalCents: p.amountCents,
      taxaCents: p.deliveryFeeCents,
      status: p.status,
      minutosAteEntregar: minutos,
    };
  });

  const consolidado = consolidar(linhas, entregadores);

  return {
    filtro,
    ...consolidado,
    linhas: linhas.slice(0, LIMITE_DE_LINHAS),
    linhasOcultas: Math.max(0, linhas.length - LIMITE_DE_LINHAS),
    entregadores: entregadores.map((e) => ({ id: e.id, nome: e.name })),
  };
}
