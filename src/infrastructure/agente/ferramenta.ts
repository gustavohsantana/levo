import type { DescricaoDeFerramenta } from './porta-llm';

/**
 * Uma ferramenta que o agente pode usar.
 *
 * O ponto todo do desenho: **o modelo não sabe fazer nada sozinho.** Ele lê,
 * interpreta e escolhe; quem consulta cardápio, calcula taxa e grava pedido é
 * código nosso, com as mesmas validações que o site já usa.
 *
 * Isso não é conservadorismo — é o que impede a categoria de erro mais cara num
 * bot de pedido: o modelo afirmar um preço que não existe. Se todo dado só pode
 * entrar na conversa por aqui, o que ele diz é conferível.
 */
export interface Ferramenta {
  nome: string;
  /**
   * O que ela faz, escrito **para o modelo ler**.
   *
   * É prompt, não documentação: é por esta frase que ele decide chamar ou não.
   * Descrição vaga é ferramenta chamada na hora errada — ou nunca chamada.
   */
  descricao: string;
  schema: Record<string, unknown>;
  executar(argumentos: Record<string, unknown>): Promise<ResultadoDeFerramenta>;
}

/**
 * O que uma ferramenta devolve.
 *
 * Erro é um resultado, não uma exceção. O modelo precisa **ler** que o CEP não
 * existe para poder pedir outro — estourar mataria a conversa e o cliente
 * levaria um silêncio.
 */
export interface ResultadoDeFerramenta {
  ok: boolean;
  dados?: unknown;
  /** Escrito para o modelo entender e reagir, não para o log. */
  erro?: string;
}

export function deuCerto(dados: unknown): ResultadoDeFerramenta {
  return { ok: true, dados };
}

export function deuErrado(erro: string): ResultadoDeFerramenta {
  return { ok: false, erro };
}

export function descrever(f: Ferramenta): DescricaoDeFerramenta {
  return { nome: f.nome, descricao: f.descricao, schema: f.schema };
}

/**
 * Serializa o resultado para o modelo ler.
 *
 * JSON compacto de propósito: é entrada cobrada por token, e indentação aqui é
 * dinheiro gasto em espaço em branco.
 */
export function serializar(r: ResultadoDeFerramenta): string {
  return JSON.stringify(r.ok ? { ok: true, dados: r.dados } : { ok: false, erro: r.erro });
}
