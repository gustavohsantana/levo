import { beforeEach, describe, expect, it } from 'vitest';
import { CreateOrder } from '@/application/use-cases/orders/create-order';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Money, Product, ValidationError } from '@/core';
import { FakeGeocoder, newDatabase } from '../helpers/fixtures';

/**
 * O preco NUNCA vem da tela.
 *
 * Quem manda o pedido pode ser qualquer coisa — outra aba, um script, um app
 * antigo em cache. Chegam os IDS das opcoes; o valor e lido do banco e somado
 * no servidor.
 */
let db: InMemoryDatabase;
let uow: InMemoryUnitOfWork;
let criar: CreateOrder;

const SABORES = 'g-sabores';
const BORDA = 'g-borda';

beforeEach(async () => {
  db = newDatabase();
  uow = new InMemoryUnitOfWork(db);
  criar = new CreateOrder(
    uow,
    new FakeGeocoder(),
    new SequentialIds('o'),
    new FixedClock(new Date('2026-09-01T18:00:00Z')),
    'est-1',
  );

  // Pizza Grande da Pizza Prime: o produto vale zero, o sabor carrega o preco.
  db.products.set(
    'pizza-g',
    Product.create({
      id: 'pizza-g',
      establishmentId: 'est-1',
      name: 'Pizza Grande 35cm',
      price: Money.zero(),
      category: 'Pizzas',
    }),
  );

  db.optionGroups.set(SABORES, {
    id: SABORES,
    name: 'Escolha até 2 sabores',
    min: 2,
    max: 2,
    options: [
      { id: 'napolitana', name: '1/2 Napolitana', price: Money.fromReais(46.45) },
      { id: 'palmito', name: '1/2 Palmito Especiale', price: Money.fromReais(60.95) },
    ],
  });
  db.optionGroups.set(BORDA, {
    id: BORDA,
    name: 'Borda',
    min: 0,
    max: 1,
    options: [{ id: 'catupiry', name: 'Borda Catupiry', price: Money.fromReais(15.9) }],
  });
  db.productGroups.set('pizza-g', [SABORES, BORDA]);
});

const base = {
  customerName: 'Cliente',
  customerPhone: '35988880001',
  address: 'Rua Exemplo, 100 - Curitiba',
};

describe('pedido com opções', () => {
  it('cobra a soma das metades escolhidas', async () => {
    const pedido = await criar.execute({
      ...base,
      items: [
        { productId: 'pizza-g', quantity: 1, options: { [SABORES]: ['napolitana', 'palmito'] } },
      ],
      deliveryFeeReais: 0,
    });

    // 46,45 + 60,95 — o mesmo total que o botao "Adicionar" do iFood mostra.
    expect(pedido.items[0].unitPrice.reais).toBe(107.4);
    expect(pedido.amount.reais).toBe(107.4);
  });

  it('a borda soma por cima', async () => {
    const pedido = await criar.execute({
      ...base,
      items: [
        {
          productId: 'pizza-g',
          quantity: 1,
          options: { [SABORES]: ['napolitana', 'palmito'], [BORDA]: ['catupiry'] },
        },
      ],
      deliveryFeeReais: 0,
    });

    expect(pedido.amount.reais).toBe(123.3);
  });

  it('grava os nomes escolhidos para a cozinha ler', async () => {
    const pedido = await criar.execute({
      ...base,
      items: [
        {
          productId: 'pizza-g',
          quantity: 1,
          options: { [SABORES]: ['napolitana', 'palmito'], [BORDA]: ['catupiry'] },
        },
      ],
      deliveryFeeReais: 0,
    });

    expect(pedido.items[0].options).toEqual([
      '1/2 Napolitana',
      '1/2 Palmito Especiale',
      'Borda Catupiry',
    ]);
  });

  it('recusa pizza sem os dois sabores', async () => {
    await expect(
      criar.execute({
        ...base,
        items: [{ productId: 'pizza-g', quantity: 1, options: { [SABORES]: ['napolitana'] } }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  /*
   * O ataque obvio: mandar uma opcao que nao existe, na esperanca de que ela
   * some zero e a pizza saia de graca.
   */
  it('recusa opção inventada em vez de cobrar zero por ela', async () => {
    await expect(
      criar.execute({
        ...base,
        items: [
          {
            productId: 'pizza-g',
            quantity: 1,
            options: { [SABORES]: ['napolitana', 'sabor-de-graca'] },
          },
        ],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('produto sem grupo continua funcionando pelo preço dele', async () => {
    db.products.set(
      'marmita',
      Product.create({
        id: 'marmita',
        establishmentId: 'est-1',
        name: 'Marmita Média',
        price: Money.fromReais(30),
        category: 'Marmitas',
      }),
    );

    const pedido = await criar.execute({
      ...base,
      items: [{ productId: 'marmita', quantity: 2 }],
      deliveryFeeReais: 0,
    });

    expect(pedido.amount.reais).toBe(60);
  });
});
