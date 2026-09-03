import type { RouteOptimizer } from '../ports/services';

/**
 * O que custa adiantar um pedido urgente.
 *
 * "Urgente" não pode significar "vai primeiro". Medido no próprio otimizador,
 * com quatro paradas em linha reta a cinco minutos uma da outra: forçar a última
 * para o começo adiantava o urgente em 6 minutos e atrasava cada um dos outros
 * três em 32. E é visivelmente burro — o dono veria o motoboy passar na frente
 * de três casas sem entregar, ir até a quarta e voltar.
 *
 * A razão é que o caminho até o urgente JÁ PASSA pelos outros. Entregar de
 * passagem custa só o tempo parado; pular todos economiza quase nada, porque o
 * percurso é o mesmo.
 *
 * Então a marcação significa outra coisa: "não deixe este ficar por último, e me
 * diga o que custa mudar". Este módulo calcula as duas rotas e a diferença. Quem
 * decide continua sendo quem sabe por que o cliente ligou.
 */

export interface ComparacaoDePrioridade {
  /** A ordem de visita mais econômica, ignorando a urgência. */
  ordemEconomica: number[];
  /** A melhor ordem possível levando o urgente primeiro. */
  ordemAdiantada: number[];
  /** Em segundos, desde a saída da loja. */
  chegadaSeEconomica: number;
  chegadaSeAdiantada: number;
  /** Quanto o urgente ganha adiantando. Pode ser zero ou negativo. */
  ganhoDoUrgente: number;
  /** Quanto cada uma das outras paradas atrasa, em média. */
  atrasoMedioDosOutros: number;
  recomendacao: 'MANTER' | 'ADIANTAR';
}

/**
 * Compara as duas rotas possíveis quando uma parada é urgente.
 *
 * `matriz` tem a loja no índice 0, como o resto do sistema. `urgente` é o índice
 * da parada marcada, na mesma numeração.
 */
export function compararPrioridade(
  matriz: number[][],
  urgente: number,
  otimizador: RouteOptimizer,
): ComparacaoDePrioridade {
  const ordemEconomica = otimizador.optimize(matriz).order;

  /*
   * A alternativa não é "urgente na frente e o resto como estava".
   *
   * Reotimizar o que sobra é o que torna a comparação honesta: mostrar um número
   * pior do que o alcançável enviesaria a recomendação para "manter", e a
   * ferramenta passaria a mentir a favor da própria preguiça.
   *
   * O truque é tratar o urgente como a nova origem — o otimizador já sabe partir
   * do índice 0, então basta remontar a matriz com ele nessa posição.
   */
  const outros = ordemEconomica.filter((p) => p !== urgente);
  const reindexado = [urgente, ...outros];
  const submatriz = reindexado.map((a) => reindexado.map((b) => matriz[a][b]));

  const subOrdem = otimizador.optimize(submatriz).order;
  const ordemAdiantada = [urgente, ...subOrdem.map((i) => reindexado[i])];

  const chegadasEconomica = chegadas(matriz, ordemEconomica);
  const chegadasAdiantada = chegadas(matriz, ordemAdiantada);

  const ganhoDoUrgente = chegadasEconomica[urgente] - chegadasAdiantada[urgente];

  const atrasos = outros.map((p) => chegadasAdiantada[p] - chegadasEconomica[p]);
  const atrasoMedioDosOutros =
    atrasos.length === 0 ? 0 : atrasos.reduce((s, a) => s + a, 0) / atrasos.length;

  return {
    ordemEconomica,
    ordemAdiantada,
    chegadaSeEconomica: chegadasEconomica[urgente],
    chegadaSeAdiantada: chegadasAdiantada[urgente],
    ganhoDoUrgente,
    atrasoMedioDosOutros,
    recomendacao: recomendar(ganhoDoUrgente, atrasoMedioDosOutros),
  };
}

/**
 * Vale a pena adiantar?
 *
 * Só quando o urgente ganha mais do que cada um dos outros perde. É a regra que
 * um dono explicaria ao telefone sem se enrolar: "adiantei o seu porque
 * atrapalhou pouco os outros".
 *
 * Repare que não há limiar inventado. Quando o urgente já está no caminho, o
 * ganho é pequeno por natureza e a conta dá "manter" sozinha — a geometria
 * decide, não um número escolhido a dedo.
 */
export function recomendar(
  ganhoDoUrgente: number,
  atrasoMedioDosOutros: number,
): 'MANTER' | 'ADIANTAR' {
  if (ganhoDoUrgente <= 0) return 'MANTER';
  return ganhoDoUrgente >= atrasoMedioDosOutros ? 'ADIANTAR' : 'MANTER';
}

/** Quando o motoboy chega em cada parada, em segundos desde a saída da loja. */
function chegadas(matriz: number[][], ordem: number[]): Record<number, number> {
  const em: Record<number, number> = {};
  let atual = 0;
  let acumulado = 0;

  for (const parada of ordem) {
    acumulado += matriz[atual][parada];
    em[parada] = acumulado;
    atual = parada;
  }

  return em;
}
