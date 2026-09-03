import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { PrismaUnitOfWork } from '@/infrastructure/persistence/prisma/unit-of-work';
import { SaveOptionGroup } from '@/application/use-cases/catalog/save-option-group';
import { SequentialIds } from '@/infrastructure/fakes/in-memory';
import { NotFoundError } from '@/core';

/**
 * O dono da loja A não encosta no cardápio da loja B.
 *
 * Contra banco de verdade, e não contra o repositório falso, porque o defeito
 * que este arquivo tranca vivia justamente no SQL: `upsert` casando só por `id`
 * e `deleteMany` sem escopo nenhum. Um teste em memória passaria feliz.
 *
 * O ataque não exige adivinhar nada. O cardápio público de qualquer loja entrega
 * os ids dos grupos e dos produtos no corpo da página — basta abrir, copiar, e
 * mandar numa Server Action autenticada como outra loja.
 */
const LOJA_A = '31111111-1111-1111-1111-111111111111';
const LOJA_B = '32222222-2222-2222-2222-222222222222';

const prisma = getPrismaClient(process.env.DATABASE_URL!);

const uowDeA = new PrismaUnitOfWork(prisma, LOJA_A);
const uowDeB = new PrismaUnitOfWork(prisma, LOJA_B);

async function criarLoja(id: string, nome: string) {
  await prisma.establishment.upsert({
    where: { id },
    create: { id, name: nome, address: 'Rua de Teste, 1', lat: -22.2, lng: -45.9 },
    update: {},
  });
}

beforeAll(async () => {
  await criarLoja(LOJA_A, 'Loja A');
  await criarLoja(LOJA_B, 'Loja B');
});

afterAll(async () => {
  for (const loja of [LOJA_A, LOJA_B]) {
    await prisma.productOptionGroup.deleteMany({ where: { group: { establishmentId: loja } } });
    await prisma.option.deleteMany({ where: { group: { establishmentId: loja } } });
    await prisma.optionGroup.deleteMany({ where: { establishmentId: loja } });
    await prisma.product.deleteMany({ where: { establishmentId: loja } });
    await prisma.establishment.deleteMany({ where: { id: loja } });
  }
});

/** O grupo "Bordas" da loja B, com a borda recheada custando R$ 8,00. */
async function bordasDaLojaB() {
  const salvar = new SaveOptionGroup(uowDeB, new SequentialIds('b'));
  return salvar.execute({
    name: 'Bordas',
    min: 0,
    max: 1,
    options: [{ name: 'Catupiry', priceReais: 8 }],
  });
}

describe('escrita entre lojas', () => {
  it('A não reescreve o grupo de opções de B', async () => {
    const grupoDeB = await bordasDaLojaB();

    const comoA = new SaveOptionGroup(uowDeA, new SequentialIds('a'));

    /*
     * É este o ataque: A manda o id de B. Antes da correção o `upsert` casava
     * por id puro e o ramo de atualização não conferia dono — a borda recheada
     * de B passava a custar zero, no cardápio público de B, sem aviso nenhum.
     */
    await expect(
      comoA.execute({
        id: grupoDeB.id,
        name: 'Bordas',
        min: 0,
        max: 1,
        options: [{ name: 'Catupiry', priceReais: 0 }],
      }),
    ).rejects.toThrow(NotFoundError);

    const depois = await prisma.optionGroup.findUnique({
      where: { id: grupoDeB.id },
      include: { options: true },
    });

    expect(depois?.establishmentId).toBe(LOJA_B);
    expect(depois?.options[0]?.priceCents).toBe(800);
  });

  it('A não desanexa os grupos de um produto de B', async () => {
    const grupoDeB = await bordasDaLojaB();

    const pizzaDeB = await prisma.product.create({
      data: {
        establishmentId: LOJA_B,
        name: 'Pizza grande',
        priceCents: 5000,
        category: 'Pizzas',
        position: 0,
      },
    });
    await prisma.productOptionGroup.create({
      data: { productId: pizzaDeB.id, groupId: grupoDeB.id, position: 0 },
    });

    /*
     * A variante puramente destrutiva: lista vazia desanexa tudo, e a pizza de B
     * passa a ser vendida sem escolha de borda. Não rouba nada — só quebra.
     */
    await expect(
      uowDeA.run((repos) => repos.optionGroups.setForProduct(pizzaDeB.id, [])),
    ).rejects.toThrow();

    const vinculos = await prisma.productOptionGroup.count({
      where: { productId: pizzaDeB.id },
    });
    expect(vinculos).toBe(1);
  });

  it('A não injeta os próprios grupos no produto de B', async () => {
    const grupoDeA = await new SaveOptionGroup(uowDeA, new SequentialIds('a2')).execute({
      name: 'Promoção da casa',
      min: 1,
      max: 1,
      options: [{ name: 'Leve 2 pague 1', priceReais: 0 }],
    });

    const pizzaDeB = await prisma.product.create({
      data: {
        establishmentId: LOJA_B,
        name: 'Pizza média',
        priceCents: 4000,
        category: 'Pizzas',
        position: 1,
      },
    });

    await expect(
      uowDeA.run((repos) => repos.optionGroups.setForProduct(pizzaDeB.id, [grupoDeA.id])),
    ).rejects.toThrow();

    const vinculos = await prisma.productOptionGroup.count({
      where: { productId: pizzaDeB.id },
    });
    expect(vinculos).toBe(0);
  });

  it('A não anexa um grupo de B aos próprios produtos', async () => {
    /*
     * Este não rouba escrita — vaza leitura. O cardápio público monta a tela a
     * partir do vínculo, então os nomes e preços do grupo de B apareceriam na
     * loja de A.
     */
    const grupoDeB = await bordasDaLojaB();

    await prisma.product.create({
      data: {
        establishmentId: LOJA_A,
        name: 'Pizza da casa',
        priceCents: 4500,
        category: 'Pizzas',
        position: 0,
      },
    });

    await expect(
      uowDeA.run((repos) => repos.optionGroups.attachToCategory(grupoDeB.id, 'Pizzas')),
    ).rejects.toThrow(NotFoundError);
  });

  it('cada loja continua editando o que é dela', async () => {
    // A trava não pode custar o caso normal, que é o que roda o dia inteiro.
    const grupo = await new SaveOptionGroup(uowDeA, new SequentialIds('a3')).execute({
      name: 'Tamanho',
      min: 1,
      max: 1,
      options: [{ name: 'Grande', priceReais: 0 }],
    });

    const editado = await new SaveOptionGroup(uowDeA, new SequentialIds('a4')).execute({
      id: grupo.id,
      name: 'Tamanho da pizza',
      min: 1,
      max: 1,
      options: [{ name: 'Grande', priceReais: 5 }],
    });

    expect(editado.id).toBe(grupo.id);

    const linha = await prisma.optionGroup.findUnique({
      where: { id: grupo.id },
      include: { options: true },
    });
    expect(linha?.name).toBe('Tamanho da pizza');
    expect(linha?.options[0]?.priceCents).toBe(500);
  });
});
