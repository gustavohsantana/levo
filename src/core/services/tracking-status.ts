/**
 * Por que este motoboy não aparece no mapa.
 *
 * "Sem rastreio" sozinho não serve para nada: o dono não sabe se liga cobrando,
 * se espera, ou se o problema é do sistema. As três causas exigem reações
 * diferentes, e distinguir é barato.
 */
export type TrackingStatus =
  /** Chegou posição há pouco. Está tudo certo. */
  | { estado: 'ATIVO'; desde: Date }
  /** O acordo é só no check da entrega — ausência de posição é o esperado. */
  | { estado: 'POR_ENTREGA' }
  /** Ele recusou a permissão no aparelho. Escolha dele, e o dono precisa saber. */
  | { estado: 'RECUSADO'; quando: Date }
  /** Já mandou posição hoje, mas parou. App fechado, sem sinal, prazo vencido. */
  | { estado: 'PAROU'; ultima: Date }
  /** Nunca mandou nada nesta rota, e nem recusou. Provavelmente não abriu. */
  | { estado: 'SEM_SINAL' };

/**
 * O limite entre "está mandando" e "parou".
 *
 * A localização ao vivo do Telegram fica quieta quando o motoboy está parado —
 * é economia de bateria, não falha. Doze minutos passam de qualquer semáforo e
 * de qualquer espera no portão, sem acusar quem só está numa fila de trânsito.
 */
const SILENCIO_MS = 12 * 60_000;

export function statusDoRastreio(input: {
  modo: 'CHECKIN' | 'CONTINUOUS';
  ultimoPing: Date | null;
  recusadoEm: Date | null;
  agora: Date;
}): TrackingStatus {
  const { modo, ultimoPing, recusadoEm, agora } = input;

  if (ultimoPing && agora.getTime() - ultimoPing.getTime() < SILENCIO_MS) {
    return { estado: 'ATIVO', desde: ultimoPing };
  }

  /*
   * A recusa só conta se for recente e posterior ao último ping.
   *
   * Quem recusou de manhã e liberou à tarde não pode ficar marcado como
   * recusado para sempre — o dado mais novo manda.
   */
  const recusaValida =
    recusadoEm
    && agora.getTime() - recusadoEm.getTime() < 24 * 60 * 60_000
    && (!ultimoPing || recusadoEm > ultimoPing);

  if (recusaValida) return { estado: 'RECUSADO', quando: recusadoEm };

  /*
   * No acordo por entrega, não ter posição agora é o combinado — não um
   * problema. Marcar como falha faria o dono cobrar alguém que está cumprindo.
   */
  if (modo === 'CHECKIN') return { estado: 'POR_ENTREGA' };

  if (ultimoPing) return { estado: 'PAROU', ultima: ultimoPing };
  return { estado: 'SEM_SINAL' };
}

/** O texto curto que vai para a tela, já com o porquê. */
export function textoDoRastreio(status: TrackingStatus): string {
  switch (status.estado) {
    case 'ATIVO':
      return 'no mapa';
    case 'POR_ENTREGA':
      return 'marca ao entregar';
    case 'RECUSADO':
      return 'recusou o rastreio';
    case 'PAROU':
      return 'parou de enviar';
    case 'SEM_SINAL':
      return 'sem sinal';
  }
}
