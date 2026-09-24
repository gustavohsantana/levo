import type { Resolucao } from '../resolver-loja';
import type { EstadoDaConversa } from './estado';
import type { MensagemDeSaida } from './mensagem-de-saida';

/**
 * Tipos compartilhados pelo motor e pelos passos do pedido.
 *
 * Moram aqui, e não em `motor.ts`, porque o motor chama os passos e os passos
 * devolvem o retrato que o motor montou. Se um importasse o tipo do outro, os
 * dois arquivos passariam a depender um do outro — e o CI recusa ciclo.
 */

export interface OpcaoDoRetrato {
  id: string;
  nome: string;
  priceCents: number;
}

export interface GrupoDoRetrato {
  id: string;
  nome: string;
  min: number;
  max: number;
  opcoes: OpcaoDoRetrato[];
}

export interface ProdutoDoRetrato {
  id: string;
  nome: string;
  aPartirDeCents: number;
  priceCents?: number;
  grupos?: GrupoDoRetrato[];
}

export interface CategoriaDoRetrato {
  nome: string;
  produtos: ProdutoDoRetrato[];
}

/** O que o motor precisa saber sobre o mundo, já carregado por quem o chama. */
export interface Retrato {
  agora: Date;
  /** De qual loja é esta conversa, pela escada do resolvedor. */
  resolucao: Resolucao;
  /** Nome de exibição por id de loja — para o carimbo e as listas. */
  nomeDaLoja: Record<string, string>;
  /** Slug por id de loja, usado nos `id` das opções. */
  slugDaLoja: Record<string, string>;
  /**
   * Pedidos que ainda não terminaram, de TODAS as lojas.
   *
   * Vêm juntos de propósito: quem escreve "oi" com pizza a caminho está
   * perguntando da pizza, não pedindo cardápio. E os dois pedidos aparecem
   * carimbados, para nenhuma loja ficar escondida atrás da outra.
   */
  pedidosEmAndamento: { id: string; displayId: string | null; lojaId: string; situacao: string }[];
  /**
   * Categorias do cardápio da loja em foco, quando já carregadas.
   *
   * Medido em produção: o cliente pediu "manda as categorias pra eu clicar".
   * Sem isto o agente despeja texto, a formatação quebra no celular, e não há
   * o que tocar. Com isto o motor responde o menu — grátis, previsível, e no
   * formato que o WhatsApp desenha como lista.
   */
  categorias?: CategoriaDoRetrato[];
}

export interface Resultado {
  estado: EstadoDaConversa;
  respostas: MensagemDeSaida[];
  /**
   * O determinístico não soube responder — quem chama deve perguntar ao agente.
   *
   * É assim que o híbrido funciona sem o motor deixar de ser puro: ele não
   * chama o modelo, ele **declara** que não sabe. Quem orquestra é que tem
   * banco e rede.
   *
   * E é o que mantém o custo em pé: enquanto o cliente toca em botões, isto
   * nunca fica verdadeiro, e nenhum token é gasto.
   */
  delegarAoAgente?: boolean;
}
