import { Money } from '../value-objects/money';
import { ValidationError } from '../errors';

/** Uma escolha oferecida dentro de um grupo. */
export interface OptionChoice {
  id: string;
  name: string;
  price: Money;
}

/**
 * Um conjunto de escolhas do produto.
 *
 * `min` e `max` respondem sozinhos o que a tela precisa saber: obrigatório é
 * `min >= 1`, meio a meio é `max === 2`, e "escolha até 8 cereais" é `max === 8`.
 * Um campo `obrigatorio` separado seria uma segunda fonte da mesma verdade.
 */
export interface OptionGroupSpec {
  id: string;
  name: string;
  min: number;
  max: number;
  options: OptionChoice[];
}

/** O que o cliente escolheu: ids de opção, por grupo. */
export type Selection = Record<string, string[]>;

/**
 * O menor preço possível do produto — o "a partir de" do cardápio.
 *
 * Base mais a soma das escolhas obrigatórias mais baratas. A fórmula é uma só e
 * vale para os dois desenhos que o mercado usa:
 *
 *     Pizza Grande   0 + (42,95 × 2)  =  85,90
 *     Açaí 200ml    13 + 0            =  13,00
 *
 * Na pizza o sabor carrega o preço e o produto vale zero; no açaí o produto
 * vale R$ 13 e a base obrigatória não cobra nada. Mesma conta.
 */
export function precoMinimo(base: Money, grupos: OptionGroupSpec[]): Money {
  return grupos.reduce((total, grupo) => {
    if (grupo.min <= 0 || grupo.options.length === 0) return total;

    /*
     * A mais barata REPETIDA, e não as `min` mais baratas distintas.
     *
     * Pizza inteira de um sabor só é duas metades iguais — e é assim que a
     * Pizza Prime chega no "a partir de R$ 85,90": 42,95 da Calabresa
     * Paulistana, duas vezes. Somar as duas mais baratas diferentes daria
     * 89,40, que não é preço de nada no cardápio deles.
     */
    const maisBarata = grupo.options.reduce((menor, opcao) =>
      opcao.price.cents < menor.price.cents ? opcao : menor,
    );

    return total.add(Money.fromCents(maisBarata.price.cents * grupo.min));
  }, base);
}

/**
 * Confere a escolha contra as regras dos grupos.
 *
 * Roda no servidor, sempre — a tela também valida, mas quem manda o pedido pode
 * ser qualquer coisa. Uma pizza sem sabor sai para a cozinha se ninguém
 * conferir aqui.
 */
export function validarSelecao(grupos: OptionGroupSpec[], escolha: Selection): void {
  for (const grupo of grupos) {
    const escolhidos = escolha[grupo.id] ?? [];

    /*
     * Repetido conta como escolha separada de propósito: dois pedaços do mesmo
     * complemento é pedido legítimo, e o `max` é quem limita.
     */
    if (escolhidos.length < grupo.min) {
      throw new ValidationError(
        grupo.min === 1
          ? `Escolha uma opção em "${grupo.name}"`
          : `Escolha ${grupo.min} opções em "${grupo.name}"`,
        { grupo: grupo.name, escolhidos: escolhidos.length, minimo: grupo.min },
      );
    }

    if (escolhidos.length > grupo.max) {
      throw new ValidationError(
        `"${grupo.name}" aceita no máximo ${grupo.max} ${grupo.max === 1 ? 'opção' : 'opções'}`,
        { grupo: grupo.name, escolhidos: escolhidos.length, maximo: grupo.max },
      );
    }

    const validos = new Set(grupo.options.map((o) => o.id));
    const invalido = escolhidos.find((id) => !validos.has(id));
    if (invalido) {
      throw new ValidationError(`Opção desconhecida em "${grupo.name}"`, {
        grupo: grupo.name,
        opcao: invalido,
      });
    }
  }
}

/** O preço da escolha: base mais tudo o que foi marcado. */
export function precoDaSelecao(
  base: Money,
  grupos: OptionGroupSpec[],
  escolha: Selection,
): Money {
  return grupos.reduce((total, grupo) => {
    const escolhidos = escolha[grupo.id] ?? [];
    return escolhidos.reduce((soma, id) => {
      const opcao = grupo.options.find((o) => o.id === id);
      return opcao ? soma.add(opcao.price) : soma;
    }, total);
  }, base);
}

/** Os nomes escolhidos, para gravar no item do pedido e a cozinha ler. */
export function nomesDaSelecao(grupos: OptionGroupSpec[], escolha: Selection): string[] {
  return grupos.flatMap((grupo) =>
    (escolha[grupo.id] ?? [])
      .map((id) => grupo.options.find((o) => o.id === id)?.name)
      .filter((nome): nome is string => Boolean(nome)),
  );
}
