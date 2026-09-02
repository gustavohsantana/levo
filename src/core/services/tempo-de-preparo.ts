/**
 * Quanto a cozinha demora, aprendido com ela mesma.
 *
 * O número que o cliente vê ao pedir vale mais que qualquer outro texto da tela:
 * é a promessa. Errar para menos gera ligação em quinze minutos; errar muito
 * para mais faz o pedido não acontecer.
 *
 * Então ele não é chutado nem configurado — sai do histórico do próprio
 * estabelecimento, que sabe se a pizza dele leva 18 ou 35 minutos.
 */

/**
 * Acima disto não é preparo, é esquecimento.
 *
 * Medido na base real: a mediana era 18,6 min e o máximo, 3918 — sessenta e
 * cinco horas, de um pedido que alguém deixou de marcar como pronto. Uma
 * amostra dessas sozinha puxava a média de 18,6 para 23,3, um erro de 25% na
 * promessa feita ao cliente.
 */
const TETO_PLAUSIVEL_MIN = 120;

/** Abaixo disto o histórico não tem o que dizer, e o padrão da loja vale mais. */
const AMOSTRAS_MINIMAS = 20;

export interface EstimativaPreparo {
  minutos: number;
  /** Como chegamos nele — a tela usa para decidir se mostra "~" ou nada. */
  base: 'HISTORICO' | 'PADRAO';
  amostras: number;
}

/**
 * O tempo de preparo prometido para um pedido que entra agora.
 *
 * Com fila, a estimativa sobe — mas não por um coeficiente inventado. Ela passa
 * a usar um percentil mais alto do MESMO histórico: com a cozinha cheia, os
 * pedidos que demoraram mais deixam de ser exceção e viram o caso provável.
 *
 * Prometer o otimista quando há fila é como se cria cliente irritado: ele não
 * compara com a média do mês, compara com o que ouviu quando pediu.
 */
export function estimarPreparo(input: {
  /** Minutos entre a chegada e o "pronto", de pedidos recentes. */
  amostrasMinutos: number[];
  /** Quantos pedidos já estão na cozinha agora. */
  naFila: number;
  /** O que a loja promete quando não há histórico suficiente. */
  padraoMinutos: number;
}): EstimativaPreparo {
  const validas = input.amostrasMinutos
    .filter((m) => Number.isFinite(m) && m > 0 && m <= TETO_PLAUSIVEL_MIN)
    .sort((a, b) => a - b);

  if (validas.length < AMOSTRAS_MINIMAS) {
    return { minutos: input.padraoMinutos, base: 'PADRAO', amostras: validas.length };
  }

  /*
   * Três faixas, três percentis — todos do próprio histórico, nenhum inventado.
   *
   * Cozinha vazia entrega no tempo típico. Cheia, entrega no tempo dos dias
   * ruins, porque é isso que um dia cheio é.
   */
  const percentil = input.naFila <= 2 ? 0.5 : input.naFila <= 5 ? 0.75 : 0.9;

  return {
    minutos: Math.round(quantil(validas, percentil)),
    base: 'HISTORICO',
    amostras: validas.length,
  };
}

/** Interpolação linear entre as amostras vizinhas. */
function quantil(ordenadas: number[], p: number): number {
  if (ordenadas.length === 1) return ordenadas[0];

  const posicao = (ordenadas.length - 1) * p;
  const baixo = Math.floor(posicao);
  const alto = Math.ceil(posicao);

  if (baixo === alto) return ordenadas[baixo];
  return ordenadas[baixo] + (ordenadas[alto] - ordenadas[baixo]) * (posicao - baixo);
}

/**
 * O texto que o cliente lê.
 *
 * Uma faixa, e não um número exato: "25 min" é uma promessa que o relógio dele
 * cobra ao minuto, e "20 a 30" é a verdade — a cozinha não é cronômetro.
 */
export function faixaDePreparo(minutos: number): string {
  const passo = minutos <= 20 ? 5 : 10;
  const inicio = Math.max(passo, Math.floor(minutos / passo) * passo);
  return `${inicio} a ${inicio + passo} min`;
}
