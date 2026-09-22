import { fecharPagamento, type CourierPayAgreement } from '@/core/services/courier-pay';

/**
 * O histórico de corridas do motoboy — a parte sem banco.
 *
 * Separado de `courier-history.ts` (que é `server-only`) pelo mesmo motivo do
 * relatório do dono: a regra de quanto ele ganhou no dia precisa ser testável
 * sem subir um Postgres. O cálculo em si é o `fecharPagamento` do domínio, já
 * coberto por testes; aqui só damos forma ao resumo do dia.
 */

export interface EntregaDoDia {
  /** Quando a entrega foi concluída (ISO). */
  quando: string;
  cliente: string;
  endereco: string;
  /** Distância da perna até o cliente — base do pagamento por faixa. */
  metros: number | null;
  /** Valor do pedido, informativo. O motoboy não recebe isto: recebe o acordo. */
  valorCents: number;
}

export interface HistoricoDoDia {
  /** Dia em Brasília, no formato `YYYY-MM-DD`. */
  dia: string;
  entregas: number;
  /** O que ele tem a receber no dia, pelo acordo dele. */
  ganhoCents: number;
  /** O acordo ainda não foi combinado — a tela avisa em vez de somar zero. */
  semAcordo: boolean;
  /** Distância total rodada no dia (soma das pernas), quando conhecida. */
  metrosTotais: number;
  itens: EntregaDoDia[];
}

/**
 * O resumo de um dia a partir das entregas concluídas nele.
 *
 * A diária (quando o acordo tem) conta uma vez, porque é um dia só — é por isso
 * que o `dia` entra em cada entrega passada ao `fecharPagamento`.
 */
export function resumirDia(
  dia: string,
  itens: EntregaDoDia[],
  acordo: CourierPayAgreement | null,
): HistoricoDoDia {
  const fechamento = acordo
    ? fecharPagamento(
        itens.map((item) => ({ meters: item.metros ?? 0, dia })),
        acordo,
      )
    : null;

  return {
    dia,
    entregas: itens.length,
    ganhoCents: fechamento?.totalCents ?? 0,
    semAcordo: fechamento ? fechamento.semAcordo : true,
    metrosTotais: itens.reduce((total, item) => total + (item.metros ?? 0), 0),
    itens,
  };
}
