/**
 * A parte do relatório que não precisa de banco.
 *
 * Separado de `reports.ts` porque aquele é `server-only` — e regra que só roda
 * dentro do servidor é regra que nenhum teste alcança. O que decide o que conta
 * como faturamento, e em que dia cada pedido cai, mora aqui e é testado.
 */
/**
 * Fuso de Brasília, fixo.
 *
 * O servidor roda em UTC e o dono pensa no relógio dele: sem converter, todo
 * pedido feito depois das 21h cai no dia seguinte do relatório, e o movimento
 * de sexta à noite aparece no sábado. O Brasil não tem horário de verão desde
 * 2019, então -03:00 é constante — se voltar, isto vira um `Intl` de verdade.
 */
const FUSO_MINUTOS = -180;

/** Início do dia (em Brasília) desta data, no instante UTC correspondente. */
export function inicioDoDia(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 0, -FUSO_MINUTOS, 0, 0));
}

/** Fim do dia, exclusivo: o dia seguinte às 00:00. */
export function fimDoDia(data: string): Date {
  const inicio = inicioDoDia(data);
  return new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
}

/** A data de hoje em Brasília, no formato dos campos de data. */
export function hojeEmBrasilia(agora = new Date()): string {
  return new Date(agora.getTime() + FUSO_MINUTOS * 60_000).toISOString().slice(0, 10);
}

/** O dia (em Brasília) de um instante. Usado para agrupar por data. */
function diaDe(instante: Date): string {
  return new Date(instante.getTime() + FUSO_MINUTOS * 60_000).toISOString().slice(0, 10);
}

export type Plataforma = 'MANUAL' | 'SITE' | 'WEBHOOK' | 'IFOOD' | 'AIQFOME';

export const NOME_DA_PLATAFORMA: Record<Plataforma, string> = {
  SITE: 'Cardápio próprio',
  IFOOD: 'iFood',
  AIQFOME: 'aiqfome',
  MANUAL: 'Telefone / balcão',
  WEBHOOK: 'Integração',
};

export interface FiltroRelatorio {
  de: string;
  ate: string;
  plataforma: Plataforma | null;
  entregadorId: string | null;
  /** `null` traz tudo; senão, só pedidos neste estado. */
  status: 'DELIVERED' | 'CANCELLED' | 'FAILED' | 'EM_ABERTO' | null;
}

export interface LinhaRelatorio {
  id: string;
  quando: string;
  displayId: string | null;
  plataforma: Plataforma;
  cliente: string;
  endereco: string;
  entregador: string | null;
  totalCents: number;
  taxaCents: number;
  status: string;
  minutosAteEntregar: number | null;
}

export interface Relatorio {
  filtro: FiltroRelatorio;
  resumo: {
    pedidos: number;
    entregues: number;
    cancelados: number;
    emAberto: number;
    faturamentoCents: number;
    taxasCents: number;
    ticketMedioCents: number;
    /** Da criação à entrega. Só de quem chegou ao fim. */
    tempoMedioMinutos: number | null;
  };
  porPlataforma: Array<{
    plataforma: Plataforma;
    pedidos: number;
    valorCents: number;
    fatia: number;
  }>;
  porEntregador: Array<{
    id: string;
    nome: string;
    entregas: number;
    valorCents: number;
    tempoMedioMinutos: number | null;
  }>;
  porDia: Array<{ dia: string; pedidos: number; valorCents: number }>;
  linhas: LinhaRelatorio[];
  /** Quantas linhas ficaram de fora da tabela. Os totais incluem todas. */
  linhasOcultas: number;
  entregadores: Array<{ id: string; nome: string }>;
}

/**
 * Os números do período, a partir das linhas.
 *
 * Separado da consulta de propósito: aqui mora a única regra que alguém pode
 * discordar — o que conta como faturamento — e regra que ninguém consegue
 * testar sem banco é regra que ninguém revisa.
 */
export function consolidar(
  linhas: LinhaRelatorio[],
  entregadores: Array<{ id: string; name: string }> = [],
): Pick<Relatorio, 'resumo' | 'porPlataforma' | 'porEntregador' | 'porDia'> {
  const entregues = linhas.filter((l) => l.status === 'DELIVERED');
  const cancelados = linhas.filter((l) => l.status === 'CANCELLED');
  const emAberto = linhas.filter((l) => l.status === 'NEW' || l.status === 'IN_ROUTE');

  /*
   * Faturamento conta só o que foi entregue.
   *
   * Somar pedido cancelado infla o número que o dono usa para decidir compra e
   * escala — e é o erro que ninguém percebe, porque o total parece ótimo.
   * Pedido em aberto também fica de fora: ainda pode não acontecer.
   */
  const faturamentoCents = entregues.reduce((t, l) => t + l.totalCents, 0);
  const taxasCents = entregues.reduce((t, l) => t + l.taxaCents, 0);
  const tempos = entregues
    .map((l) => l.minutosAteEntregar)
    .filter((x): x is number => x !== null);

  const porPlataforma = agrupar(entregues, (l) => l.plataforma).map(([plataforma, itens]) => ({
    plataforma: plataforma as Plataforma,
    pedidos: itens.length,
    valorCents: itens.reduce((t, l) => t + l.totalCents, 0),
    fatia: entregues.length ? itens.length / entregues.length : 0,
  }));
  porPlataforma.sort((a, b) => b.valorCents - a.valorCents);

  const porEntregador = agrupar(
    entregues.filter((l) => l.entregador),
    (l) => l.entregador!,
  ).map(([nome, itens]) => {
    const meus = itens.map((l) => l.minutosAteEntregar).filter((x): x is number => x !== null);
    return {
      id: entregadores.find((e) => e.name === nome)?.id ?? nome,
      nome,
      entregas: itens.length,
      valorCents: itens.reduce((t, l) => t + l.totalCents, 0),
      tempoMedioMinutos: meus.length ? Math.round(media(meus)) : null,
    };
  });
  porEntregador.sort((a, b) => b.entregas - a.entregas);

  /*
   * O gráfico por dia conta TODOS os pedidos, mas só soma o valor dos
   * entregues: volume e receita são perguntas diferentes, e um dia com muito
   * cancelamento precisa aparecer como o que é.
   */
  const porDia = agrupar(linhas, (l) => diaDe(new Date(l.quando)))
    .map(([dia, itens]) => ({
      dia,
      pedidos: itens.length,
      valorCents: itens
        .filter((l) => l.status === 'DELIVERED')
        .reduce((t, l) => t + l.totalCents, 0),
    }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  return {
    resumo: {
      pedidos: linhas.length,
      entregues: entregues.length,
      cancelados: cancelados.length,
      emAberto: emAberto.length,
      faturamentoCents,
      taxasCents,
      ticketMedioCents: entregues.length ? Math.round(faturamentoCents / entregues.length) : 0,
      tempoMedioMinutos: tempos.length ? Math.round(media(tempos)) : null,
    },
    porPlataforma,
    porEntregador,
    porDia,
  };
}

function agrupar<T>(itens: T[], chave: (item: T) => string): Array<[string, T[]]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const atual = mapa.get(k);
    if (atual) atual.push(item);
    else mapa.set(k, [item]);
  }
  return [...mapa.entries()];
}

function media(numeros: number[]): number {
  return numeros.reduce((t, n) => t + n, 0) / numeros.length;
}
