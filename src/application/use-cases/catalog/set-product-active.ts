import { NotFoundError, type UnitOfWork } from '@/core';

/**
 * Tira ou devolve um item à lista.
 *
 * Existe em vez de excluir porque a maioria dos casos é temporária — acabou o
 * estoque, é sazonal — e excluir levaria junto a referência dos pedidos que já
 * usaram o item.
 */
export class SetProductActive {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(id: string, active: boolean): Promise<void> {
    await this.uow.run(async (repos) => {
      const product = await repos.products.findById(id);
      if (!product) throw new NotFoundError('Produto', id);

      product.setActive(active);
      await repos.products.save(product);
    });
  }
}
