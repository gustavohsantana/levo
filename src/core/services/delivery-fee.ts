import { Money } from '../value-objects';

/**
 * Faixa de taxa por distância.
 *
 * `uptoMeters` é o limite superior. A última faixa cobre tudo acima dela, e a
 * ausência de faixas devolve a taxa fixa do estabelecimento — quem não quer
 * cobrar por distância não precisa saber que isso existe.
 */
export interface DeliveryFeeBand {
  uptoMeters: number;
  fee: Money;
}

/**
 * Quanto cobrar de entrega para uma distância.
 *
 * A faixa escolhida é a primeira cujo limite alcança a distância. Sem faixa que
 * alcance — cliente mais longe que tudo o que foi cadastrado — vale a última,
 * que é a mais cara: recusar o pedido ou entregar de graça seriam as duas
 * piores respostas para quem está com o telefone na mão.
 */
export function taxaPorDistancia(
  metros: number,
  faixas: DeliveryFeeBand[],
  padrao: Money,
): Money {
  if (faixas.length === 0) return padrao;

  const ordenadas = [...faixas].sort((a, b) => a.uptoMeters - b.uptoMeters);
  const faixa = ordenadas.find((f) => metros <= f.uptoMeters);

  return (faixa ?? ordenadas[ordenadas.length - 1]).fee;
}
