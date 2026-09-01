import { describe, expect, it } from 'vitest';
import { ReorderCatalog, completar } from '@/application/use-cases/catalog/reorder-catalog';
import { Money, Product } from '@/core';
import { InMemoryDatabase, InMemoryUnitOfWork } from '@/infrastructure/fakes/in-memory';
import { PIZZARIA } from '../helpers/fixtures';

/**
 * Ordem do cardápio.
 *
 * Antes disto a lista saía em ordem alfabética, e a pizzaria de exemplo abria
 * com "Açaí" — porque começa com A — com as pizzas soterradas no meio. Ordem de
 * cardápio é decisão comercial: o que vende mais fica em cima.
 */
function produto(nome: string, categoria: string, position: number) {
  return Product.create({
    id: `p-${nome}`,
    establishmentId: PIZZARIA.id,
    name: nome,
    price: Money.fromCents(1000),
    category: categoria,
    position,
  });
}

function comCardapio(...itens: Product[]) {
  const db = new InMemoryDatabase(PIZZARIA);
  for (const p of itens) db.products.set(p.id, p);
  return { db, uow: new InMemoryUnitOfWork(db) };
}

function nomesEm(db: InMemoryDatabase, categoria: string) {
  return [...db.products.values()]
    .filter((p) => p.category === categoria)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'))
    .map((p) => p.name);
}

describe('mover produto', () => {
  it('sobe uma posição dentro da categoria', async () => {
    const { db, uow } = comCardapio(
      produto('Coca', 'Bebidas', 1),
      produto('Guaraná', 'Bebidas', 2),
      produto('Suco', 'Bebidas', 3),
    );

    await new ReorderCatalog(uow).moverProduto('p-Suco', 'cima');

    expect(nomesEm(db, 'Bebidas')).toEqual(['Coca', 'Suco', 'Guaraná']);
  });

  it('não sai da categoria pela borda de cima', async () => {
    const { db, uow } = comCardapio(
      produto('Coca', 'Bebidas', 1),
      produto('Guaraná', 'Bebidas', 2),
    );

    await new ReorderCatalog(uow).moverProduto('p-Coca', 'cima');

    expect(nomesEm(db, 'Bebidas')).toEqual(['Coca', 'Guaraná']);
  });

  it('ignora produtos de outra categoria ao decidir o vizinho', async () => {
    const { db, uow } = comCardapio(
      produto('Coca', 'Bebidas', 1),
      produto('Pizza', 'Pizzas', 1),
      produto('Guaraná', 'Bebidas', 2),
    );

    await new ReorderCatalog(uow).moverProduto('p-Guaraná', 'cima');

    expect(nomesEm(db, 'Bebidas')).toEqual(['Guaraná', 'Coca']);
    // A pizza não se mexeu: mover é sobre vizinhança dentro da categoria.
    expect(nomesEm(db, 'Pizzas')).toEqual(['Pizza']);
  });

  it('conserta posições empatadas ao mover', async () => {
    /*
     * Produto criado antes do backfill, ou importado em lote, pode chegar com
     * tudo em zero. Renumerar a categoria inteira no movimento evita carregar a
     * suposição de que a numeração está sempre limpa.
     */
    const { db, uow } = comCardapio(
      produto('Agua', 'Bebidas', 0),
      produto('Beterraba', 'Bebidas', 0),
      produto('Cerveja', 'Bebidas', 0),
    );

    await new ReorderCatalog(uow).moverProduto('p-Cerveja', 'cima');

    expect(nomesEm(db, 'Bebidas')).toEqual(['Agua', 'Cerveja', 'Beterraba']);
    expect([...db.products.values()].map((p) => p.position).sort()).toEqual([1, 2, 3]);
  });
});

describe('mover categoria', () => {
  it('sobe a categoria no cardápio', async () => {
    const { db, uow } = comCardapio(
      produto('Acai', 'Açaí', 1),
      produto('Pizza', 'Pizzas', 1),
    );
    db.categoryOrder = ['Açaí', 'Pizzas'];

    await new ReorderCatalog(uow).moverCategoria('Pizzas', 'cima');

    expect(db.categoryOrder).toEqual(['Pizzas', 'Açaí']);
  });

  it('não perde categoria que ainda não estava na ordem guardada', async () => {
    /*
     * Categoria nasce de um produto novo, não de um cadastro — então ela não
     * está na lista salva. Sem completar antes de mover, ela sumiria da ordem no
     * primeiro movimento de qualquer outra.
     */
    const { db, uow } = comCardapio(
      produto('Acai', 'Açaí', 1),
      produto('Pizza', 'Pizzas', 1),
      produto('Brownie', 'Sobremesas', 1),
    );
    db.categoryOrder = ['Pizzas', 'Açaí'];

    await new ReorderCatalog(uow).moverCategoria('Açaí', 'cima');

    expect(db.categoryOrder).toEqual(['Açaí', 'Pizzas', 'Sobremesas']);
  });
});

describe('completar a ordem guardada', () => {
  it('põe as novas no fim, em ordem alfabética', () => {
    const produtos = [
      produto('Pizza', 'Pizzas', 1),
      produto('Coca', 'Bebidas', 1),
      produto('Acai', 'Açaí', 1),
    ];

    expect(completar(['Pizzas'], produtos)).toEqual(['Pizzas', 'Açaí', 'Bebidas']);
  });

  it('esquece categoria que não tem mais produto', () => {
    // Renomear ou esvaziar uma categoria deixaria lixo na lista para sempre.
    expect(completar(['Antiga', 'Pizzas'], [produto('Pizza', 'Pizzas', 1)])).toEqual(['Pizzas']);
  });
});
