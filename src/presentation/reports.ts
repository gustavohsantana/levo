import { Money } from '@/core';
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
 * Quantas linhas por página da tabela.
 *
 * Os totais continuam somando o período inteiro — é o que os torna corretos. O
 * que pagina é a lista: trezentas linhas de uma vez não são controle, são uma
 * página que não abre no celular, e ninguém lê a de número 217 sem procurar.
 *
 * Dez, e não cinquenta. Cinquenta ainda era rolagem longa demais para a
 * pergunta que a tela responde — "quem levou o quê, e quando" — que se resolve
 * olhando poucas linhas por vez e trocando de página.
 */
const POR_PAGINA = 10;

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
      // A distância da perna é a base do pagamento por faixa do motoboy.
      stop: { select: { legDistanceMeters: true } },
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

  const entregadoresCompletos = await prisma.courier.findMany({
    where: { establishmentId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      payModel: true,
      payPerDeliveryCents: true,
      payDailyCents: true,
    },
  });
  const entregadores = entregadoresCompletos.map((c) => ({ id: c.id, name: c.name }));

  // O filtro por entregador é aplicado aqui porque ele mora na rota, não no
  // pedido — levá-lo para o `where` exigiria um join que o Prisma só faz por
  // relação, e a relação existe do outro lado.
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const inicio = (pagina - 1) * POR_PAGINA;

  const doFiltro = filtro.entregadorId
    ? pedidos.filter((p) => (p.routeId ? porRota.get(p.routeId)?.id : null) === filtro.entregadorId)
    : pedidos;

  const linhas: LinhaRelatorio[] = doFiltro.map((p) => {
    const daRota = p.routeId ? porRota.get(p.routeId) : undefined;
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
      entregador: daRota?.nome ?? null,
      entregadorId: daRota?.id ?? null,
      metros: p.stop?.legDistanceMeters ?? null,
      totalCents: p.amountCents,
      taxaCents: p.deliveryFeeCents,
      status: p.status,
      minutosAteEntregar: minutos,
    };
  });

  /*
   * Os acordos de todos os entregadores, numa consulta. Sem eles o relatório
   * some com a única pergunta que o dono faz no domingo: quanto eu pago.
   */
  const bandas = await prisma.courierPayBand.findMany({
    where: { courier: { establishmentId } },
    orderBy: { uptoMeters: 'asc' },
    select: { courierId: true, uptoMeters: true, amountCents: true },
  });

  const acordos = new Map(
    entregadoresCompletos.map((c) => [
      c.id,
      {
        model: c.payModel,
        perDelivery: Money.fromCents(c.payPerDeliveryCents),
        daily: Money.fromCents(c.payDailyCents),
        bands: bandas
          .filter((b) => b.courierId === c.id)
          .map((b) => ({ uptoMeters: b.uptoMeters, amount: Money.fromCents(b.amountCents) })),
      },
    ]),
  );

  const consolidado = consolidar(linhas, entregadores, acordos);

  return {
    filtro,
    ...consolidado,
    linhas: linhas.slice(inicio, inicio + POR_PAGINA),
    pagina,
    paginas: Math.max(1, Math.ceil(linhas.length / POR_PAGINA)),
    totalDeLinhas: linhas.length,
    entregadores: entregadores.map((e) => ({ id: e.id, nome: e.name })),
  };
}
