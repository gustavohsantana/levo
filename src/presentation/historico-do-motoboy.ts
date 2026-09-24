import {
  fecharPagamento,
  valorDaFaixa,
  type CourierPayAgreement,
} from '@/core/services/courier-pay';
import { hojeEmBrasilia } from './reports-core';

/**
 * O que o motoboy concluiu hoje, e quanto isso dá a receber.
 *
 * O dia é o mesmo do acerto da loja: Brasília, via `hojeEmBrasilia`. Uma entrega
 * das 22h não pode cair em "amanhã" porque o servidor guarda UTC.
 *
 * O valor é o acordo dele (`fecharPagamento`), não o total do pedido. Somar o
 * que o cliente pagou seria faturamento da loja apresentado como salário.
 */

export interface EntregaConcluida {
  id: string;
  cliente: string;
  endereco: string;
  /** ISO do instante em que a entrega foi concluída. */
  quando: string;
  /** Distância da perna até o cliente. Base do pagamento por faixa. */
  metros: number;
}

export interface LinhaDoDia {
  id: string;
  cliente: string;
  endereco: string;
  quando: string;
  /**
   * Centavos desta corrida.
   *
   * `null` quando o acordo não define valor: a tela lista a entrega e não
   * escreve R$ 0,00 no lugar de um número que ninguém combinou.
   */
  aReceberCents: number | null;
}

export interface HistoricoDoDia {
  /** `YYYY-MM-DD` em Brasília. */
  hoje: string;
  linhas: LinhaDoDia[];
  /**
   * Soma a receber, diária inclusa quando o acordo tem.
   *
   * `null` no dia vazio e quando não há acordo. Zero só aparece se o acordo
   * existe e a conta fecha em zero — aí o zero é o número, não um chute.
   */
  totalCents: number | null;
  /** Já inclusa em `totalCents`. Zero quando o acordo não paga diária. */
  diariasCents: number;
  semAcordo: boolean;
}

export function montarHistoricoDoDia(
  entregas: readonly EntregaConcluida[],
  acordo: CourierPayAgreement,
  agora = new Date(),
): HistoricoDoDia {
  const hoje = hojeEmBrasilia(agora);
  const deHoje = entregas
    .filter((entrega) => hojeEmBrasilia(new Date(entrega.quando)) === hoje)
    .sort((a, b) => (a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0));

  if (deHoje.length === 0) {
    return { hoje, linhas: [], totalCents: null, diariasCents: 0, semAcordo: false };
  }

  const fechamento = fecharPagamento(
    deHoje.map((entrega) => ({ meters: entrega.metros, dia: hoje })),
    acordo,
  );

  if (fechamento.semAcordo) {
    return {
      hoje,
      linhas: deHoje.map((entrega) => linha(entrega, null)),
      totalCents: null,
      diariasCents: 0,
      semAcordo: true,
    };
  }

  return {
    hoje,
    linhas: deHoje.map((entrega) => linha(entrega, centavosDaCorrida(entrega.metros, acordo))),
    totalCents: fechamento.totalCents,
    diariasCents: fechamento.diariasCents,
    semAcordo: false,
  };
}

function linha(entrega: EntregaConcluida, aReceberCents: number | null): LinhaDoDia {
  return {
    id: entrega.id,
    cliente: entrega.cliente,
    endereco: entrega.endereco,
    quando: entrega.quando,
    aReceberCents,
  };
}

function centavosDaCorrida(metros: number, acordo: CourierPayAgreement): number {
  if (acordo.model === 'POR_FAIXA' || acordo.model === 'DIARIA_E_FAIXA') {
    return valorDaFaixa(metros, acordo.bands).cents;
  }
  return acordo.perDelivery.cents;
}
