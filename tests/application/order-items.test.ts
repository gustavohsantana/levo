import { beforeEach, describe, expect, it } from 'vitest';
import { CreateOrder } from '@/application/use-cases/orders/create-order';
import { SaveProduct } from '@/application/use-cases/catalog/save-product';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { Coordinates, NotFoundError, ValidationError } from '@/core';
import { FakeGeocoder, newDatabase } from '../helpers/fixtures';

/**
 * Pedido montado a partir do catálogo.
 *
 * O caso é o telefone tocando: quem atende escolhe os itens em vez de somar de
 * cabeça. O pedido guarda **cópia** do nome e do preço — o preço muda amanhã e
 * o pedido de hoje precisa continuar valendo o que valeu, senão a conta do dia
 * se reescreve sozinha a cada reajuste.
 */
let db: InMemoryDatabase;
let criar: CreateOrder;
let salvarProduto: SaveProduct;

const cliente = {
  customerName: 'Ana',
  address: 'Rua das Flores, 100 - Centro, Pouso Alegre',
};

beforeEach(() => {
  db = newDatabase();
  const uow = new InMemoryUnitOfWork(db);
  const clock = new FixedClock(new Date('2026-08-26T18:00:00Z'));

  criar = new CreateOrder(
    uow,
    new FakeGeocoder(Coordinates.create(-22.23, -45.93)),
    new SequentialIds('o'),
    clock,
    'est-1',
  );
  salvarProduto = new SaveProduct(uow, new SequentialIds('p'), 'est-1');
});

describe('pedido com itens do catálogo', () => {
  it('soma o total a partir dos itens', async () => {
    const pizza = await salvarProduto.execute({ name: 'Pizza', priceReais: 45.5 });
    const coca = await salvarProduto.execute({ name: 'Coca 2L', priceReais: 12 });

    const pedido = await criar.execute({
      ...cliente,
      items: [
        { productId: pizza.id, quantity: 2 },
        { productId: coca.id, quantity: 1 },
      ],
    });

    expect(pedido.amount.cents).toBe(45_50 * 2 + 12_00);
    expect(pedido.items).toHaveLength(2);
  });

  it('ignora o valor digitado quando há itens', async () => {
    // Dois números para a mesma coisa acabam discordando, e a versão errada
    // seria a que aparece na conta do dia.
    const pizza = await salvarProduto.execute({ name: 'Pizza', priceReais: 45.5 });

    const pedido = await criar.execute({
      ...cliente,
      amountReais: 999,
      items: [{ productId: pizza.id, quantity: 1 }],
    });

    expect(pedido.amount.cents).toBe(45_50);
  });

  it('aceita valor digitado quando não há itens', async () => {
    // O item fora do catálogo continua sendo caso real: promoção do dia, taxa
    // combinada por telefone.
    const pedido = await criar.execute({ ...cliente, amountReais: 30 });

    expect(pedido.amount.cents).toBe(30_00);
    expect(pedido.items).toHaveLength(0);
  });

  it('congela nome e preço no momento do pedido', async () => {
    const produto = await salvarProduto.execute({ name: 'Marmita', priceReais: 20 });
    const pedido = await criar.execute({
      ...cliente,
      items: [{ productId: produto.id, quantity: 1 }],
    });

    // Reajuste depois do pedido não pode reescrever o histórico.
    await salvarProduto.execute({ id: produto.id, name: 'Marmita Grande', priceReais: 26 });

    expect(pedido.items[0].name).toBe('Marmita');
    expect(pedido.items[0].unitPrice.cents).toBe(20_00);
    expect(pedido.amount.cents).toBe(20_00);
  });

  it('recusa produto que não existe', async () => {
    await expect(
      criar.execute({ ...cliente, items: [{ productId: 'fantasma', quantity: 1 }] }),
    ).rejects.toThrow(NotFoundError);
  });

  it('recusa quantidade inválida', async () => {
    const produto = await salvarProduto.execute({ name: 'Água', priceReais: 4 });

    await expect(
      criar.execute({ ...cliente, items: [{ productId: produto.id, quantity: 0 }] }),
    ).rejects.toThrow(ValidationError);
  });

  it('não deixa pedir produto de outro estabelecimento', async () => {
    // O repositório já nasce com o escopo do tenant; o item some da busca e o
    // caso de uso trata como inexistente.
    const outro = new SaveProduct(new InMemoryUnitOfWork(db), new SequentialIds('x'), 'est-2');
    const alheio = await outro.execute({ name: 'De outro', priceReais: 10 });
    db.products.delete(alheio.id);

    await expect(
      criar.execute({ ...cliente, items: [{ productId: alheio.id, quantity: 1 }] }),
    ).rejects.toThrow(NotFoundError);
  });
});

/**
 * Taxa de entrega, desconto e forma de pagamento.
 *
 * O desconto guarda o **valor**, não a porcentagem: é o valor que entra na
 * conta, e recalcular a porcentagem a cada exibição abriria a chance de um
 * centavo diferente entre a tela e o que foi cobrado.
 */
describe('composição do pedido', () => {
  it('soma a taxa de entrega ao total dos itens', async () => {
    const pizza = await salvarProduto.execute({ name: 'Pizza', priceReais: 50 });

    const pedido = await criar.execute({
      ...cliente,
      items: [{ productId: pizza.id, quantity: 1 }],
      deliveryFeeReais: 8,
    });

    expect(pedido.amount.cents).toBe(58_00);
    expect(pedido.deliveryFee.cents).toBe(8_00);
    expect(pedido.subtotal.cents).toBe(50_00);
  });

  it('aplica desconto na linha antes de somar', async () => {
    const pizza = await salvarProduto.execute({ name: 'Pizza', priceReais: 50 });

    const pedido = await criar.execute({
      ...cliente,
      items: [{ productId: pizza.id, quantity: 2, discountReais: 15 }],
    });

    expect(pedido.amount.cents).toBe(100_00 - 15_00);
    expect(pedido.items[0].discount.cents).toBe(15_00);
  });

  it('não deixa o desconto tornar a linha negativa', async () => {
    // Desconto maior que o item viraria crédito, que este produto não sabe
    // representar — e um total negativo estragaria o fechamento do dia.
    const agua = await salvarProduto.execute({ name: 'Água', priceReais: 4 });

    const pedido = await criar.execute({
      ...cliente,
      items: [{ productId: agua.id, quantity: 1, discountReais: 10 }],
    });

    expect(pedido.amount.cents).toBe(0);
  });

  it('guarda a forma de pagamento', async () => {
    const pedido = await criar.execute({ ...cliente, amountReais: 30, paymentMethod: 'PIX' });

    expect(pedido.paymentMethod).toBe('PIX');
  });

  it('subtotal separa venda de frete', async () => {
    // O acerto do dia precisa dos dois separados: um é receita da cozinha, o
    // outro é do entregador.
    const pedido = await criar.execute({
      ...cliente,
      amountReais: 40,
      deliveryFeeReais: 7,
    });

    expect(pedido.deliveryFee.cents).toBe(7_00);
  });
});
