import type { Product, UnitOfWork } from '@/core';

export type Direcao = 'cima' | 'baixo';

/**
 * Ordem do cardápio: quem aparece antes.
 *
 * Ordem de cardápio é decisão comercial — o que vende mais fica em cima, a
 * promoção do dia sobe, bebida desce para o fim. Sem isto a lista sai em ordem
 * alfabética, e uma pizzaria abre com "Açaí" porque começa com A.
 *
 * Um caso de uso para produto e categoria porque são a mesma operação vista de
 * duas alturas, e a tela mostra as duas lado a lado.
 */
export class ReorderCatalog {
  constructor(private readonly uow: UnitOfWork) {}

  /**
   * Move um produto uma posição dentro da categoria dele.
   *
   * Produto não pula de categoria por aqui: para isso existe a edição, onde o
   * dono escolhe a categoria pelo nome. Mover é sobre vizinhança, não sobre
   * pertencimento.
   */
  async moverProduto(productId: string, direcao: Direcao): Promise<void> {
    await this.uow.run(async (repos) => {
      const todos = await repos.products.list();
      const alvo = todos.find((p) => p.id === productId);
      if (!alvo) return;

      const irmaos = ordenar(todos.filter((p) => mesmaCategoria(p, alvo)));
      const atual = irmaos.findIndex((p) => p.id === productId);
      const destino = direcao === 'cima' ? atual - 1 : atual + 1;
      if (destino < 0 || destino >= irmaos.length) return;

      const [movido] = irmaos.splice(atual, 1);
      irmaos.splice(destino, 0, movido);

      /*
       * Renumera a categoria inteira em vez de trocar só os dois.
       *
       * O backfill numerou o que existia, mas produto criado depois entra com a
       * posição do momento e produto apagado deixa buraco. Renumerar aqui é uma
       * escrita a mais numa ação que o dono faz de vez em quando, e dispensa
       * carregar a suposição de que a numeração está sempre limpa.
       */
      for (const [indice, produto] of irmaos.entries()) {
        const posicao = indice + 1;
        if (produto.position === posicao) continue;
        produto.moverPara(posicao);
        await repos.products.save(produto);
      }
    });
  }

  /** Move uma categoria inteira uma posição no cardápio. */
  async moverCategoria(nome: string, direcao: Direcao): Promise<void> {
    await this.uow.run(async (repos) => {
      const todos = await repos.products.list();
      const guardada = await repos.establishments.categoryOrder();
      const atualLista = completar(guardada, todos);

      const atual = atualLista.indexOf(nome);
      if (atual < 0) return;
      const destino = direcao === 'cima' ? atual - 1 : atual + 1;
      if (destino < 0 || destino >= atualLista.length) return;

      const [movida] = atualLista.splice(atual, 1);
      atualLista.splice(destino, 0, movida);

      await repos.establishments.saveCategoryOrder(atualLista);
    });
  }
}

function mesmaCategoria(a: Product, b: Product): boolean {
  return (a.category ?? '') === (b.category ?? '');
}

function ordenar(produtos: Product[]): Product[] {
  return [...produtos].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

/**
 * A lista guardada mais as categorias que apareceram depois dela.
 *
 * Categoria nova nasce de um produto novo, não de um cadastro — então ela não
 * está na ordem guardada e precisa entrar antes de qualquer movimento, senão
 * mover a de baixo a faria sumir da lista salva.
 */
export function completar(guardada: string[], produtos: Product[]): string[] {
  const existentes = new Set(
    produtos.map((p) => p.category).filter((c): c is string => Boolean(c)),
  );
  const conhecidas = guardada.filter((nome) => existentes.has(nome));
  const novas = [...existentes]
    .filter((nome) => !conhecidas.includes(nome))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...conhecidas, ...novas];
}
