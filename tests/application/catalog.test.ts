import { beforeEach, describe, expect, it } from 'vitest';
import { SaveProduct } from '@/application/use-cases/catalog/save-product';
import { SetProductActive } from '@/application/use-cases/catalog/set-product-active';
import { RemoveProduct } from '@/application/use-cases/catalog/remove-product';
import {
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Money, Product, ValidationError } from '@/core';
import { newDatabase } from '../helpers/fixtures';

/**
 * O catálogo é da plataforma, não espelho de marketplace.
 *
 * Ele existe para o pedido que nenhum aplicativo cobre — o cliente que liga ou
 * manda mensagem. Importar preenche a lista; o produto passa a ser nosso.
 */
let db: InMemoryDatabase;
let salvar: SaveProduct;
let alternar: SetProductActive;
let remover: RemoveProduct;

beforeEach(() => {
  db = newDatabase();
  const uow = new InMemoryUnitOfWork(db);
  salvar = new SaveProduct(uow, new SequentialIds('p'), 'est-1');
  alternar = new SetProductActive(uow);
  remover = new RemoveProduct(uow);
});

describe('catálogo', () => {
  it('cadastra um produto', async () => {
    const produto = await salvar.execute({
      name: '  Pizza Calabresa  ',
      priceReais: 49.9,
      category: ' Pizzas ',
    });

    expect(produto.name).toBe('Pizza Calabresa');
    expect(produto.price.cents).toBe(4990);
    expect(produto.category).toBe('Pizzas');
    expect(produto.source).toBe('MANUAL');
    expect(produto.active).toBe(true);
  });

  it('recusa produto sem nome utilizável', async () => {
    // Linha em branco na lista de quem atende ao telefone é pior que ausência.
    await expect(salvar.execute({ name: ' x ', priceReais: 10 })).rejects.toThrow(
      ValidationError,
    );
  });

  it('edita sem criar um segundo produto', async () => {
    const criado = await salvar.execute({ name: 'Coca 2L', priceReais: 12 });

    const editado = await salvar.execute({
      id: criado.id,
      name: 'Coca-Cola 2L',
      priceReais: 13.5,
    });

    expect(editado.id).toBe(criado.id);
    expect(editado.name).toBe('Coca-Cola 2L');
    expect(editado.price.cents).toBe(1350);
    expect(db.products.size).toBe(1);
  });

  it('deixa editar item importado sem mexer na procedência', async () => {
    // O preço do WhatsApp costuma ser diferente do preço do marketplace.
    const importado = Product.create({
      id: 'p-ifood',
      establishmentId: 'est-1',
      name: 'Marmita P',
      price: Money.fromReais(20),
      source: 'IFOOD',
      externalId: 'item-9',
    });
    db.products.set(importado.id, importado);

    const editado = await salvar.execute({
      id: importado.id,
      name: 'Marmita Pequena',
      priceReais: 22,
    });

    expect(editado.name).toBe('Marmita Pequena');
    expect(editado.source).toBe('IFOOD');
    expect(editado.externalId).toBe('item-9');
    expect(editado.importado).toBe(true);
  });

  it('pausa e reativa sem apagar', async () => {
    // Acabou o estoque hoje; volta amanhã. Apagar levaria junto a referência
    // dos pedidos que já usaram o item.
    const produto = await salvar.execute({ name: 'Açaí 500ml', priceReais: 18 });

    await alternar.execute(produto.id, false);
    expect(db.products.get(produto.id)!.active).toBe(false);

    await alternar.execute(produto.id, true);
    expect(db.products.get(produto.id)!.active).toBe(true);
  });

  it('reaproveita a grafia da categoria que já existe', async () => {
    // "doces" e "Doces" em dias diferentes viravam dois grupos na tela, e o
    // dono só descobria quando a lista ficasse estranha.
    await salvar.execute({ name: 'Brigadeiro', priceReais: 5, category: 'Doces' });
    const segundo = await salvar.execute({
      name: 'Beijinho',
      priceReais: 5,
      category: 'doces',
    });

    expect(segundo.category).toBe('Doces');
  });

  it('mantém a grafia de quem inaugura a categoria', async () => {
    const produto = await salvar.execute({
      name: 'Yakisoba',
      priceReais: 32,
      category: 'orientais',
    });

    expect(produto.category).toBe('orientais');
  });

  it('apaga de vez quando pedido', async () => {
    const produto = await salvar.execute({ name: 'Item errado', priceReais: 1 });

    await remover.execute(produto.id);

    expect(db.products.has(produto.id)).toBe(false);
  });

  it('lista agrupável: ordena por categoria e depois por nome', async () => {
    await salvar.execute({ name: 'Guaraná', priceReais: 8, category: 'Bebidas' });
    await salvar.execute({ name: 'Pizza Marguerita', priceReais: 45, category: 'Pizzas' });
    await salvar.execute({ name: 'Água', priceReais: 4, category: 'Bebidas' });

    const uow = new InMemoryUnitOfWork(db);
    const lista = await uow.run((repos) => repos.products.list());

    // Acento entra na ordenação: "Água" vem antes de "Guaraná".
    expect(lista.map((p) => p.name)).toEqual(['Água', 'Guaraná', 'Pizza Marguerita']);
  });

  it('esconde inativos quando a tela pede só os ativos', async () => {
    const a = await salvar.execute({ name: 'Ativo', priceReais: 10 });
    const b = await salvar.execute({ name: 'Pausado', priceReais: 10 });
    await alternar.execute(b.id, false);

    const uow = new InMemoryUnitOfWork(db);
    const lista = await uow.run((repos) => repos.products.list({ onlyActive: true }));

    expect(lista.map((p) => p.id)).toEqual([a.id]);
  });
});
