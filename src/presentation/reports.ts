import { Money } from '@/core';
import 'server-only';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { env } from '@/env';
import { requireSession } from './http/session';
import {
  consolidar,
  fimDoDia,
  hojeEmBrasilia,
  inicioDoDia,
  type FiltroRelatorio,
  type LinhaRelatorio,
  type Plataforma,
  type Relatorio,
} from './reports-core';
import { fecharPagamento, type CourierPayAgreement } from '@/core/services/courier-pay';

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

/** O que o dono precisa acertar com cada motoboy pelas entregas de hoje. */
export interface AcertoDoDia {
  entregadores: Array<{
    id: string;
    nome: string;
    entregas: number;
    aPagarCents: number;
    /** O acordo ainda não foi combinado — a tela avisa em vez de somar zero. */
    semAcordo: boolean;
  }>;
  totalCents: number;
}

/**
 * O acerto de hoje, por motoboy — o número que o dono conta na mão no fim do dia.
 *
 * Fica no painel, e não só no relatório, porque é a pergunta do fim do turno:
 * "quanto pago pra cada um?". Consulta enxuta de propósito — o painel recarrega
 * a cada dez segundos, então carrega só as entregas de hoje, não o período.
 *
 * A base é a mesma do relatório (`fecharPagamento`, o acordo de cada um): a
 * diária conta uma vez porque é um dia só, e a faixa/fixo soma corrida a corrida.
 */
export async function getAcertoDoDia(): Promise<AcertoDoDia> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishmentId = session.establishmentId;
  const hoje = hojeEmBrasilia();

  const entregues = await prisma.order.findMany({
    where: {
      establishmentId,
      status: 'DELIVERED',
      createdAt: { gte: inicioDoDia(hoje), lt: fimDoDia(hoje) },
      routeId: { not: null },
    },
    // A distância da perna é a base do pagamento por faixa.
    select: { routeId: true, stop: { select: { legDistanceMeters: true } } },
  });

  if (entregues.length === 0) return { entregadores: [], totalCents: 0 };

  const rotaIds = [...new Set(entregues.map((p) => p.routeId).filter((x): x is string => !!x))];
  const rotas = await prisma.route.findMany({
    where: { establishmentId, id: { in: rotaIds } },
    select: { id: true, courierId: true, courier: { select: { name: true } } },
  });
  const porRota = new Map(rotas.map((r) => [r.id, { id: r.courierId, nome: r.courier.name }]));

  /* Agrupa as entregas de hoje por motoboy — só quem de fato rodou aparece. */
  const porMotoboy = new Map<string, { nome: string; metros: number[] }>();
  for (const pedido of entregues) {
    const dono = pedido.routeId ? porRota.get(pedido.routeId) : null;
    if (!dono) continue;
    const atual = porMotoboy.get(dono.id) ?? { nome: dono.nome, metros: [] };
    atual.metros.push(pedido.stop?.legDistanceMeters ?? 0);
    porMotoboy.set(dono.id, atual);
  }

  const ids = [...porMotoboy.keys()];
  const linhas = ids.length
    ? await prisma.courier.findMany({
        where: { establishmentId, id: { in: ids } },
        select: {
          id: true,
          payModel: true,
          payPerDeliveryCents: true,
          payDailyCents: true,
          payBands: { orderBy: { uptoMeters: 'asc' }, select: { uptoMeters: true, amountCents: true } },
        },
      })
    : [];
  const acordoDe = new Map<string, CourierPayAgreement>(
    linhas.map((c) => [
      c.id,
      {
        model: c.payModel,
        perDelivery: Money.fromCents(c.payPerDeliveryCents),
        daily: Money.fromCents(c.payDailyCents),
        bands: c.payBands.map((b) => ({ uptoMeters: b.uptoMeters, amount: Money.fromCents(b.amountCents) })),
      },
    ]),
  );

  const entregadores = ids.map((id) => {
    const grupo = porMotoboy.get(id)!;
    const acordo = acordoDe.get(id);
    const fechamento = acordo
      ? fecharPagamento(
          grupo.metros.map((meters) => ({ meters, dia: hoje })),
          acordo,
        )
      : null;

    return {
      id,
      nome: grupo.nome,
      entregas: grupo.metros.length,
      aPagarCents: fechamento?.totalCents ?? 0,
      semAcordo: fechamento ? fechamento.semAcordo : true,
    };
  });

  entregadores.sort((a, b) => b.aPagarCents - a.aPagarCents);

  return {
    entregadores,
    totalCents: entregadores.reduce((t, e) => t + e.aPagarCents, 0),
  };
}

/** Uma entrega concluída, para o detalhe do entregador no relatório. */
export interface EntregaDoEntregador {
  quando: string;
  cliente: string;
  endereco: string;
  metros: number | null;
  totalCents: number;
  minutos: number | null;
}

/**
 * As entregas de um motoboy no período — o detalhe atrás do resumo.
 *
 * O relatório mostra "8 entregas · R$ 64" por motoboy; quem clica quer ver
 * quais foram. Consulta própria, e não a lista paginada do relatório: aqui é
 * TUDO do motoboy no período, não a página que calhou de estar aberta.
 */
export async function entregasDoEntregador(
  courierId: string,
  filtro: { de: string; ate: string },
): Promise<EntregaDoEntregador[]> {
  const session = await requireSession();
  const prisma = getPrismaClient(env().DATABASE_URL);
  const establishmentId = session.establishmentId;

  const rotas = await prisma.route.findMany({
    where: { establishmentId, courierId },
    select: { id: true },
  });
  const rotaIds = rotas.map((r) => r.id);
  if (rotaIds.length === 0) return [];

  const pedidos = await prisma.order.findMany({
    where: {
      establishmentId,
      status: 'DELIVERED',
      routeId: { in: rotaIds },
      createdAt: { gte: inicioDoDia(filtro.de), lt: fimDoDia(filtro.ate) },
    },
    orderBy: { deliveredAt: 'desc' },
    select: {
      createdAt: true,
      deliveredAt: true,
      customerName: true,
      address: true,
      amountCents: true,
      stop: { select: { legDistanceMeters: true } },
    },
  });

  return pedidos.map((p) => ({
    quando: (p.deliveredAt ?? p.createdAt).toISOString(),
    cliente: p.customerName,
    endereco: p.address,
    metros: p.stop?.legDistanceMeters ?? null,
    totalCents: p.amountCents,
    minutos: p.deliveredAt
      ? Math.round((p.deliveredAt.getTime() - p.createdAt.getTime()) / 60_000)
      : null,
  }));
}
