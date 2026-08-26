import { Money, NotFoundError, Product, type IdGenerator, type UnitOfWork } from '@/core';

interface Input {
  /** Ausente cria; presente edita. */
  id?: string | null;
  name: string;
  description?: string | null;
  priceReais: number;
  category?: string | null;
  imageUrl?: string | null;
}

/**
 * Cria ou edita um item do catálogo.
 *
 * Um caso de uso só para os dois porque a regra é a mesma e o formulário é o
 * mesmo: separar em `Create` e `Update` duplicaria a validação de nome e preço
 * para ganhar nada.
 */
export class SaveProduct {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly establishmentId: string,
  ) {}

  async execute(input: Input): Promise<Product> {
    return this.uow.run(async (repos) => {
      const price = Money.fromReais(input.priceReais);
      const category = await this.categoriaCanonica(repos, input.category);

      if (!input.id) {
        const product = Product.create({
          id: this.ids.next(),
          establishmentId: this.establishmentId,
          name: input.name,
          description: input.description,
          price,
          category,
          imageUrl: input.imageUrl,
        });

        await repos.products.save(product);
        return product;
      }

      const product = await repos.products.findById(input.id);
      if (!product) throw new NotFoundError('Produto', input.id);

      /*
       * Editar um produto importado é permitido, e de propósito: o preço do
       * WhatsApp costuma ser diferente do preço do marketplace. A procedência
       * fica registrada, mas não vira cadeado — e nada é escrito de volta lá.
       */
      product.edit({
        name: input.name,
        description: input.description,
        price,
        category,
        imageUrl: input.imageUrl,
      });

      await repos.products.save(product);
      return product;
    });
  }

  /**
   * Reaproveita a grafia da categoria que já existe.
   *
   * "doces" e "Doces" digitados em dias diferentes viravam dois grupos na
   * tela, e o dono só descobria quando a lista ficasse estranha. Comparar sem
   * caixa e devolver a grafia original resolve na entrada, que é onde custa
   * barato — depois, seria migração de dados.
   *
   * Quem escreve uma categoria nova mantém a grafia dele: a primeira vez
   * define, as seguintes seguem.
   */
  private async categoriaCanonica(
    repos: { products: { list(): Promise<Product[]> } },
    escrita: string | null | undefined,
  ): Promise<string | null> {
    const nome = escrita?.trim();
    if (!nome) return null;

    const existentes = await repos.products.list();
    const igual = existentes.find(
      (p) => p.category && p.category.toLocaleLowerCase() === nome.toLocaleLowerCase(),
    );

    return igual?.category ?? nome;
  }
}
