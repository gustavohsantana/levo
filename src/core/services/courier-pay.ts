import { Money } from '../value-objects';

/**
 * Quanto o motoboy tem a receber no período.
 *
 * Os acordos aqui são os que o mercado usa de verdade em delivery com frota
 * própria. Percentual do pedido ficou de fora de propósito: é praxe de
 * marketplace, e num delivery próprio faz o motoboy torcer pelo pedido caro em
 * vez do trajeto curto — o incentivo aponta para o lado errado.
 *
 * A diária é ortogonal ao valor da corrida: acompanha tanto o fixo
 * (`DIARIA_E_ENTREGA`) quanto as faixas (`DIARIA_E_FAIXA`). Tem motoboy que
 * combina garantido por dia mais um valor que cresce com a distância — e antes
 * esse acordo real não cabia em nenhum dos modelos.
 */
export type CourierPayModel =
  | 'POR_ENTREGA'
  | 'POR_FAIXA'
  | 'DIARIA_E_ENTREGA'
  | 'DIARIA_E_FAIXA';

/** O valor da corrida vem das faixas de distância, não de um fixo. */
function pagaPorFaixa(model: CourierPayModel): boolean {
  return model === 'POR_FAIXA' || model === 'DIARIA_E_FAIXA';
}

/** O acordo garante uma diária por dia rodado, além do valor da corrida. */
function temDiaria(model: CourierPayModel): boolean {
  return model === 'DIARIA_E_ENTREGA' || model === 'DIARIA_E_FAIXA';
}

export interface CourierPayBand {
  /** Limite superior. A última faixa cobre tudo acima dela. */
  uptoMeters: number;
  amount: Money;
}

export interface CourierPayAgreement {
  model: CourierPayModel;
  perDelivery: Money;
  daily: Money;
  bands: CourierPayBand[];
}

export interface EntregaFeita {
  /** Distância percorrida até o cliente. */
  meters: number;
  /** O dia (em Brasília) em que ela aconteceu. A diária conta por dia rodado. */
  dia: string;
}

export interface Fechamento {
  entregas: number;
  diasRodados: number;
  porEntregaCents: number;
  diariasCents: number;
  totalCents: number;
  /** O acordo ainda não foi combinado: todo valor é zero e a tela precisa dizer. */
  semAcordo: boolean;
}

/**
 * O valor da faixa para uma distância.
 *
 * Mais longe que tudo o que foi cadastrado vale a última faixa, que é a maior:
 * a alternativa seria pagar zero por uma entrega que aconteceu.
 */
export function valorDaFaixa(metros: number, faixas: CourierPayBand[]): Money {
  if (faixas.length === 0) return Money.fromCents(0);

  const ordenadas = [...faixas].sort((a, b) => a.uptoMeters - b.uptoMeters);
  const faixa = ordenadas.find((f) => metros <= f.uptoMeters);

  return (faixa ?? ordenadas[ordenadas.length - 1]).amount;
}

export function fecharPagamento(
  entregas: EntregaFeita[],
  acordo: CourierPayAgreement,
): Fechamento {
  const diasRodados = new Set(entregas.map((e) => e.dia)).size;

  const porEntregaCents = pagaPorFaixa(acordo.model)
    ? entregas.reduce((t, e) => t + valorDaFaixa(e.meters, acordo.bands).cents, 0)
    : entregas.length * acordo.perDelivery.cents;

  /*
   * A diária conta por dia em que ele rodou, não por dia do período: motoboy
   * que trabalha três dias na semana não recebe sete diárias, e quem folgou não
   * some da conta dos dias que trabalhou.
   */
  const diariasCents = temDiaria(acordo.model) ? diasRodados * acordo.daily.cents : 0;

  /*
   * "Sem acordo" é quando não há de onde tirar centavo nenhum: o valor da
   * corrida está zerado E, se houver diária no modelo, ela também. Uma diária
   * sozinha, sem faixa/fixo, ainda é um acordo — o motoboy recebe o garantido.
   */
  const corridaEmBranco = pagaPorFaixa(acordo.model)
    ? acordo.bands.length === 0
    : acordo.perDelivery.cents === 0;

  const semAcordo = temDiaria(acordo.model)
    ? corridaEmBranco && acordo.daily.cents === 0
    : corridaEmBranco;

  return {
    entregas: entregas.length,
    diasRodados,
    porEntregaCents,
    diariasCents,
    totalCents: porEntregaCents + diariasCents,
    semAcordo,
  };
}
