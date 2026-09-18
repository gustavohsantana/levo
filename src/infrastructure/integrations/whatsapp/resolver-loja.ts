import type { MensagemRecebida } from './webhook-protocol';

/**
 * De qual loja é esta conversa.
 *
 * A peça mais importante da integração, e a única cuja forma errada custa caro
 * depois. São três arranjos de número em produção ao mesmo tempo:
 *
 * 1. **Número da loja** — a resposta já veio no canal.
 * 2. **Número do Levô, compartilhado** — precisa ser descoberta.
 * 3. **Número do Levô, de faixa** — igual ao 2; vários números existem por
 *    isolamento de reputação, não por capacidade.
 *
 * Amarrar o pedido ao `phone_number_id` funcionaria hoje e quebraria no dia em
 * que o segundo arranjo entrasse — no meio de conversas de cliente rodando em
 * produção. Por isso a pergunta que este módulo responde é "qual loja", nunca
 * "qual número".
 */

/** O canal por onde a mensagem chegou. */
export interface Canal {
  id: string;
  /** Preenchido só quando o número é da própria loja. */
  establishmentId: string | null;
  active: boolean;
}

/**
 * O que o bot descobriu sobre de qual loja é a conversa.
 *
 * Três respostas, e não uma com ressalva, porque cada uma leva a uma tela
 * diferente — e espremer as três num `establishmentId` com flag foi o que me
 * fez, na primeira versão, sugerir uma loja quando o certo era perguntar.
 */
export type Resolucao =
  /** Sabemos. Segue o pedido. */
  | { tipo: 'loja'; establishmentId: string; via: 'canal' | 'codigo' | 'memoria' }
  /**
   * O cliente já pediu em mais de uma. O bot pergunta **neutro** — "onde você
   * quer pedir hoje?" — listando as dele, da mais recente para a mais antiga.
   *
   * Sugerir a mais recente seria o Levô escolher favorito entre duas lojas que
   * pagam por ele. A ordem da lista é conveniência de memória; a pergunta é de
   * quem escolhe.
   */
  | { tipo: 'escolher'; opcoes: { establishmentId: string; resolvedAt: Date }[] }
  /** Nem link, nem histórico. Quem chama pergunta o nome da loja. */
  | { tipo: 'desconhecida' };

/** Quem sabe procurar loja e lembrar de conversa. */
export interface FontesDaLoja {
  canalPorNumero(phoneNumberId: string): Promise<Canal | null>;
  /** A loja de um código curto ("pizzajoao"), se existir e estiver ativa. */
  lojaPorCodigo(codigo: string): Promise<string | null>;
  /**
   * As lojas onde este cliente já pediu por este canal, da mais recente para a
   * mais antiga. Vazio quando é a primeira vez.
   */
  historico(channelId: string, customerPhone: string): Promise<{ establishmentId: string; resolvedAt: Date }[]>;
  lembrar(channelId: string, customerPhone: string, establishmentId: string): Promise<void>;
}

/**
 * Por quanto tempo a memória de uma conversa vale.
 *
 * Trinta dias é generoso de propósito. O cliente que pede uma vez por mês não
 * deveria ter que repetir de qual loja é — e perguntar "de qual loja?" a cada
 * visita é o atrito que faz ele desistir e ligar no telefone. Passado o prazo,
 * perguntar é mais honesto que chutar.
 */
export const VALIDADE_DA_MEMORIA_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * De qual loja é esta conversa.
 *
 * Duas entradas bem diferentes chegam aqui, e é isso que a escada trata:
 *
 * - **Veio pelo cardápio da loja** — tocou no link dela, e o código vem junto.
 *   Zero atrito, zero ambiguidade: é o caminho da maioria.
 * - **Chamou o Levô por vontade própria** — abriu a conversa antiga e escreveu
 *   "oi". Aqui não há código, e quem responde é o histórico dele.
 */
export async function resolverLoja(
  msg: MensagemRecebida,
  fontes: FontesDaLoja,
  agora: Date = new Date(),
): Promise<Resolucao> {
  const canal = await fontes.canalPorNumero(msg.paraNumeroId);

  /*
   * Número desconhecido ou desligado não atende. A mesma inscrição da Meta
   * entrega eventos de TODOS os números do app — inclusive o de teste e o de
   * uma loja que acabou de sair. Atender qualquer um faria o número desligado
   * continuar tomando pedido.
   */
  if (!canal || !canal.active) return { tipo: 'desconhecida' };

  // 1. Número da loja: a pergunta já está respondida.
  if (canal.establishmentId) {
    return { tipo: 'loja', establishmentId: canal.establishmentId, via: 'canal' };
  }

  /*
   * 2. O código no texto vence a memória.
   *
   * Quem tocou no link de outra loja está pedindo de outra loja, e a memória
   * diria a anterior. Deixar a memória ganhar aqui mandaria o pedido para a
   * cozinha errada — o pior erro possível nesta função.
   */
  const codigo = codigoNoTexto(msg.texto);
  if (codigo) {
    const porCodigo = await fontes.lojaPorCodigo(codigo);
    if (porCodigo) {
      await fontes.lembrar(canal.id, msg.de, porCodigo);
      return { tipo: 'loja', establishmentId: porCodigo, via: 'codigo' };
    }
  }

  /*
   * 3. O histórico do cliente.
   *
   * A mais recente é a resposta provável — mas só vira resposta FINAL quando
   * ela é a única. Com duas ou mais, o bot pergunta, listando as lojas que o
   * próprio cliente escolheu um dia.
   *
   * E é só isso que ele mostra: loja que o cliente não escolheu antes NUNCA
   * aparece. Sem descoberta, sem "perto de você", sem sugestão. O Levô é o
   * encanamento entre a loja e o cliente dela, não uma vitrine que apresenta o
   * concorrente para quem a loja trouxe.
   */
  const recentes = (await fontes.historico(canal.id, msg.de)).filter(
    (h) => agora.getTime() - h.resolvedAt.getTime() <= VALIDADE_DA_MEMORIA_MS,
  );

  if (recentes.length === 0) return { tipo: 'desconhecida' };

  /*
   * Pediu só num lugar: não há o que perguntar. O bot oferece repetir ali, que
   * é o que ele quer em quase todo caso — e perguntar seria atrito sem ganho.
   */
  if (recentes.length === 1) {
    return { tipo: 'loja', establishmentId: recentes[0].establishmentId, via: 'memoria' };
  }

  return { tipo: 'escolher', opcoes: recentes };
}

/**
 * O código da loja escondido na primeira mensagem.
 *
 * Vem do link `wa.me/<número>?text=`, que o cardápio, o QR da mesa e o
 * Instagram da loja carregam. O cliente não digita isso — ele toca no link, e o
 * WhatsApp pré-preenche.
 *
 * O marcador é `#loja:` em vez de uma palavra solta porque o texto ao redor é
 * escrito por humano e muda ("Oi! Quero pedir na …"). Procurar um código sem
 * marcador acertaria o nome de um prato mais cedo ou mais tarde.
 */
const MARCADOR = /#loja:([a-z0-9][a-z0-9-]{1,48})/i;

export function codigoNoTexto(texto: string | null): string | null {
  if (!texto) return null;
  const achado = MARCADOR.exec(texto);
  return achado ? achado[1].toLowerCase() : null;
}

/**
 * O link que a loja publica.
 *
 * Existe aqui, e não espalhado pelas telas, porque as duas pontas têm que
 * concordar no formato do marcador — e é exatamente o tipo de par que passa a
 * divergir na primeira vez que só um dos lados é ajustado.
 */
export function linkDeEntrada(numeroDoLevo: string, codigoDaLoja: string, saudacao?: string): string {
  const texto = `${saudacao ?? 'Olá! Quero fazer um pedido.'} #loja:${codigoDaLoja}`;
  return `https://wa.me/${numeroDoLevo.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}
