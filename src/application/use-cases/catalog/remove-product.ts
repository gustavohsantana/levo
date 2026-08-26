import { type UnitOfWork } from '@/core';

/**
 * Apaga de vez.
 *
 * Para o item cadastrado por engano. Quem quer só tirar da lista usa
 * `SetProductActive` — a tela oferece os dois, com nomes diferentes, porque
 * são decisões diferentes.
 */
export class RemoveProduct {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(id: string): Promise<void> {
    await this.uow.run(async (repos) => {
      await repos.products.delete(id);
    });
  }
}
