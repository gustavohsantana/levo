import type { ResultadoDeFerramenta } from './ferramenta';

/**
 * As barreiras que não dependem de o modelo colaborar.
 *
 * Instrução no prompt ("nunca invente preço") funciona quase sempre, e é o
 * "quase" que quebra: um modelo que erra um preço em 1% das conversas erra um
 * a cada cem pedidos, e quem paga a diferença é o lojista — que descobre no
 * fim do mês, sem saber de onde veio.
 *
 * Então o prompt pede, e isto **confere**.
 */

/**
 * Valores em reais que o modelo afirmou sem ter recebido de ferramenta.
 *
 * Um valor tem procedência quando ele **é** um número que veio de ferramenta,
 * ou quando é a **soma** de alguns deles. A soma precisa entrar porque o total
 * do pedido é legítimo e nunca vem pronto: o modelo junta o item com a taxa, e
 * acusar isso encheria o log de alarme falso até ninguém mais olhar.
 *
 * O que sobra — valor que não é nenhum número visto nem soma de dois ou três
 * deles — é o caso que importa: preço inventado. Aí quem chama decide: em
 * confirmação de pedido, barrar; em resposta solta, registrar e seguir.
 */
export function valoresSemProcedencia(
  texto: string,
  resultados: ResultadoDeFerramenta[],
): string[] {
  const citados = valoresNoTexto(texto);
  if (citados.length === 0) return [];

  const vistos = centavosNosResultados(resultados);

  return citados
    .filter((valor) => !temProcedencia(Math.round(valor * 100), vistos))
    .map((v) => v.toFixed(2).replace('.', ','));
}

/**
 * Todo número que aparece nos resultados, normalizado para centavos.
 *
 * As ferramentas devolvem centavos (é como o domínio guarda) e o modelo escreve
 * em reais. Um número decimal no resultado — "7.50" — também vira 750, porque
 * algumas fontes externas devolvem reais.
 */
function centavosNosResultados(resultados: ResultadoDeFerramenta[]): number[] {
  const fonte = resultados.map((r) => JSON.stringify(r)).join(' ');
  const achados = new Set<number>();

  for (const m of fonte.matchAll(/\d+(?:\.\d+)?/g)) {
    const n = Number(m[0]);
    if (!Number.isFinite(n)) continue;
    achados.add(Math.round(n));            // já em centavos
    if (m[0].includes('.')) achados.add(Math.round(n * 100)); // veio em reais
  }

  return [...achados];
}

/**
 * Até três parcelas.
 *
 * Cobre o que aparece de verdade — item + taxa, dois itens + taxa — sem virar
 * combinatória. Acima disso o modelo estaria somando tanta coisa que conferir
 * valor a valor deixaria de dizer alguma coisa.
 */
function temProcedencia(alvo: number, vistos: number[]): boolean {
  if (vistos.includes(alvo)) return true;

  for (let i = 0; i < vistos.length; i += 1) {
    for (let j = i + 1; j < vistos.length; j += 1) {
      if (vistos[i] + vistos[j] === alvo) return true;
      for (let k = j + 1; k < vistos.length; k += 1) {
        if (vistos[i] + vistos[j] + vistos[k] === alvo) return true;
      }
    }
  }

  return false;
}

/** "R$ 62,90", "R$62.90", "62,90 reais" — as formas que aparecem de verdade. */
const VALOR = /R\$\s*(\d{1,3}(?:\.\d{3})*|\d+)[,.](\d{2})\b|\b(\d{1,4})[,.](\d{2})\s*reais\b/gi;

function valoresNoTexto(texto: string): number[] {
  const achados: number[] = [];

  for (const m of texto.matchAll(VALOR)) {
    const inteiro = (m[1] ?? m[3] ?? '').replace(/\./g, '');
    const centavos = m[2] ?? m[4] ?? '00';
    const valor = Number(`${inteiro}.${centavos}`);
    if (Number.isFinite(valor)) achados.push(valor);
  }

  return [...new Set(achados)];
}

/**
 * Tetos de uma conversa.
 *
 * `iteracoes` é a rede contra laço infinito: modelo que chama ferramenta, lê o
 * erro, chama de novo, para sempre. Sem teto isso vira uma conta de API aberta
 * enquanto o cliente olha para o nada.
 *
 * `tokensDeSaida` limita o gasto por rodada. Os dois são baixos de propósito:
 * uma conversa de pedido que precisa de mais de meia dúzia de passos é uma
 * conversa que já deveria ter ido para um humano.
 */
export interface Limites {
  iteracoes: number;
  tokensDeSaida: number;
}

export const LIMITES_PADRAO: Limites = { iteracoes: 6, tokensDeSaida: 20_000 };
