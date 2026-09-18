/**
 * O contrato com um modelo de linguagem, reduzido ao mínimo.
 *
 * Existe para que o núcleo do agente não conheça OpenAI, Anthropic nem nenhum
 * outro. Três razões, e a terceira é a que mais paga:
 *
 * 1. Trocar de provedor vira um arquivo, não uma refatoração.
 * 2. O mesmo núcleo serve o Levô e a clínica.
 * 3. **O laço inteiro é testável sem rede.** Uma porta falsa devolve a resposta
 *    que o teste quiser, e aí dá para provar comportamento de erro, teto de
 *    iterações e guardrail sem gastar um centavo nem depender da internet.
 *
 * Vocabulário em português porque é o do resto do projeto, e porque "papel" e
 * "chamada" dizem a mesma coisa que role e tool_call sem obrigar quem lê a
 * traduzir de cabeça.
 */

/** Uma chamada de ferramenta que o modelo pediu. */
export interface ChamadaDeFerramenta {
  /**
   * O id da chamada, definido pelo provedor.
   *
   * Precisa voltar junto do resultado: quando o modelo pede três ferramentas de
   * uma vez, é só por ele que o provedor sabe qual resultado é de qual chamada.
   */
  id: string;
  nome: string;
  /** Os argumentos já parseados. Nunca string — quem parseia é o adaptador. */
  argumentos: Record<string, unknown>;
}

/** Uma fala do diálogo, do ponto de vista do modelo. */
export type FalaDoDialogo =
  | { papel: 'usuario'; texto: string }
  | { papel: 'assistente'; texto: string | null; chamadas?: ChamadaDeFerramenta[] }
  /** O retorno de uma ferramenta, amarrado à chamada que o pediu. */
  | { papel: 'ferramenta'; chamadaId: string; nome: string; conteudo: string };

/** Quanto custou. Serve para o teto de gasto e para medir o custo por pedido. */
export interface Uso {
  entrada: number;
  saida: number;
  /**
   * Parte da entrada servida do cache de prefixo.
   *
   * É o número que decide se a economia está funcionando: o prompt de sistema e
   * o cardápio se repetem em toda chamada, e sem cache eles seriam cobrados
   * inteiros toda vez. Zero aqui, em chamadas seguidas, quer dizer que algo
   * volátil entrou no prefixo e o invalidou.
   */
  entradaEmCache: number;
}

export interface RespostaDoModelo {
  /** O que dizer ao usuário. `null` quando o modelo só pediu ferramenta. */
  texto: string | null;
  chamadas: ChamadaDeFerramenta[];
  uso: Uso;
}

/** A ferramenta como o modelo a enxerga — sem a implementação. */
export interface DescricaoDeFerramenta {
  nome: string;
  descricao: string;
  /** JSON Schema dos argumentos. */
  schema: Record<string, unknown>;
}

export interface PedidoAoModelo {
  /** Instruções fixas. Fica no começo do prefixo, para o cache aproveitar. */
  sistema: string;
  dialogo: FalaDoDialogo[];
  ferramentas: DescricaoDeFerramenta[];
}

export interface PortaDeLLM {
  /** O nome do modelo, só para log e medição. */
  readonly modelo: string;
  responder(pedido: PedidoAoModelo): Promise<RespostaDoModelo>;
}

export function usoZerado(): Uso {
  return { entrada: 0, saida: 0, entradaEmCache: 0 };
}

export function somarUso(a: Uso, b: Uso): Uso {
  return {
    entrada: a.entrada + b.entrada,
    saida: a.saida + b.saida,
    entradaEmCache: a.entradaEmCache + b.entradaEmCache,
  };
}
