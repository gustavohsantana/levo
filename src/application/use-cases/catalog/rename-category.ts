import { ValidationError, type UnitOfWork } from '@/core';

/**
 * Renomeia uma categoria inteira.
 *
 * Sem isto, corrigir "Bebida" para "Bebidas" exigia abrir cada produto — e
 * ninguém faz isso com quinze itens, então o catálogo fica com as duas
 * convivendo e a tela do cliente mostra dois grupos do mesmo.
 *
 * Renomear para uma categoria existente **funde** as duas. É recurso, não
 * acidente: é exatamente assim que se conserta a duplicata.
 */
export class RenameCategory {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(de: string, para: string): Promise<number> {
    const destino = para.trim();

    if (destino.length < 2) {
      throw new ValidationError('A categoria precisa de um nome', { categoria: para });
    }

    return this.uow.run((repos) => repos.products.renameCategory(de, destino));
  }
}
