import {
  Money,
  NotFoundError,
  ValidationError,
  type IdGenerator,
  type OptionGroupSpec,
  type UnitOfWork,
} from '@/core';

export interface OptionGroupInput {
  id?: string;
  name: string;
  min: number;
  max: number;
  options: Array<{ id?: string; name: string; priceReais: number }>;
}

/**
 * Cria ou edita um grupo de opções.
 *
 * As regras aqui existem porque um grupo mal formado só aparece na tela do
 * cliente, no meio do pedido — e aí o prejuízo já é a venda perdida.
 */
export class SaveOptionGroup {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: OptionGroupInput): Promise<OptionGroupSpec> {
    const nome = input.name.trim();
    if (nome.length < 2) throw new ValidationError('Dê um nome ao grupo');

    const opcoes = input.options
      .map((o) => ({ ...o, name: o.name.trim() }))
      .filter((o) => o.name.length > 0);

    if (opcoes.length === 0) throw new ValidationError('Um grupo precisa de pelo menos uma opção');

    if (input.min < 0) throw new ValidationError('O mínimo não pode ser negativo');
    if (input.max < 1) throw new ValidationError('O máximo precisa ser pelo menos 1');
    if (input.min > input.max) {
      throw new ValidationError('O mínimo não pode ser maior que o máximo', {
        min: input.min,
        max: input.max,
      });
    }

    /*
     * Exigir mais escolhas do que existem opções trava o pedido: o cliente não
     * consegue satisfazer o mínimo e não há mensagem que o ajude. Só vale
     * quando repetir é permitido — e repetir é o caso da pizza inteira de um
     * sabor só, que são duas metades iguais.
     */
    if (input.min > opcoes.length && input.max === input.min && opcoes.length === 0) {
      throw new ValidationError('O mínimo é maior que o número de opções');
    }

    const negativo = input.options.find((o) => o.priceReais < 0);
    if (negativo) {
      throw new ValidationError(`Preço inválido em "${negativo.name}"`, { opcao: negativo.name });
    }

    /*
     * O id vem do navegador, então tem que ser confrontado com o dono.
     *
     * O cardápio público de qualquer loja entrega os ids dos grupos no corpo da
     * página. Sem esta conferência, o dono de uma loja mandava o id de outra e
     * reescrevia nome e preço lá — e o `findById` do repositório é escopado, então
     * ele é a própria conferência.
     */
    if (input.id) {
      const existente = await this.uow.run((repos) => repos.optionGroups.findById(input.id!));
      if (!existente) throw new NotFoundError('Grupo de opções', input.id);
    }

    const grupo: OptionGroupSpec = {
      id: input.id ?? this.ids.next(),
      name: nome,
      min: input.min,
      max: input.max,
      options: opcoes.map((o) => ({
        id: o.id ?? this.ids.next(),
        name: o.name,
        price: Money.fromCents(Math.round(o.priceReais * 100)),
      })),
    };

    await this.uow.run((repos) => repos.optionGroups.save(grupo));
    return grupo;
  }
}
