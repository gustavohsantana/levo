import { Money } from '../value-objects';

/**
 * Quanto o motoboy tem a receber no período.
 *
 * Os três acordos aqui são os que o mercado usa de verdade em delivery com frota
 * própria. Percentual do pedido ficou de fora de propósito: é praxe de
 * marketplace, e num delivery próprio faz o motoboy torcer pelo pedido caro em
 * vez do trajeto curto — o incentivo aponta para o lado errado.
 */
export type CourierPayModel = 'POR_ENTREGA' | 'POR_FAIXA' | 'DIARIA_E_ENTREGA';

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

  const porEntregaCents =
    acordo.model === 'POR_FAIXA'
      ? entregas.reduce((t, e) => t + valorDaFaixa(e.meters, acordo.bands).cents, 0)
      : entregas.length * acordo.perDelivery.cents;

  /*
   * A diária conta por dia em que ele rodou, não por dia do período: motoboy
   * que trabalha três dias na semana não recebe sete diárias, e quem folgou não
   * some da conta dos dias que trabalhou.
   */
  const diariasCents =
    acordo.model === 'DIARIA_E_ENTREGA' ? diasRodados * acordo.daily.cents : 0;

  const semAcordo =
    acordo.model === 'POR_FAIXA'
      ? acordo.bands.length === 0
      : acordo.model === 'DIARIA_E_ENTREGA'
        ? acordo.perDelivery.cents === 0 && acordo.daily.cents === 0
        : acordo.perDelivery.cents === 0;

  return {
    entregas: entregas.length,
    diasRodados,
    porEntregaCents,
    diariasCents,
    totalCents: porEntregaCents + diariasCents,
    semAcordo,
  };
}
