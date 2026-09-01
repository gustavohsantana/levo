import { beforeEach, describe, expect, it } from 'vitest';
import { SaveOptionGroup } from '@/application/use-cases/catalog/save-option-group';
import { InMemoryDatabase, InMemoryUnitOfWork, SequentialIds } from '@/infrastructure/fakes/in-memory';
import { ValidationError } from '@/core';
import { newDatabase } from '../helpers/fixtures';

let db: InMemoryDatabase;
let uow: InMemoryUnitOfWork;
let salvar: SaveOptionGroup;

beforeEach(() => {
  db = newDatabase();
  uow = new InMemoryUnitOfWork(db);
  salvar = new SaveOptionGroup(uow, new SequentialIds('g'));
});

const bordas = {
  name: 'Borda',
  min: 0,
  max: 1,
  options: [
    { name: 'Catupiry', priceReais: 15.9 },
    { name: 'Cheddar', priceReais: 15.9 },
  ],
};

describe('salvar grupo', () => {
  it('grava o grupo com as opções em centavos', async () => {
    const grupo = await salvar.execute(bordas);

    expect(grupo.options[0].price.cents).toBe(1590);
    expect(await uow.run((r) => r.optionGroups.findById(grupo.id))).not.toBeNull();
  });

  it('descarta opção sem nome em vez de gravar linha vazia', async () => {
    const grupo = await salvar.execute({
      ...bordas,
      options: [...bordas.options, { name: '   ', priceReais: 0 }],
    });

    expect(grupo.options).toHaveLength(2);
  });

  /*
   * Um grupo mal formado so aparece na tela do cliente, no meio do pedido — e
   * ai o prejuizo ja e a venda perdida. Por isso a recusa e aqui.
   */
  it('recusa mínimo maior que o máximo', async () => {
    await expect(salvar.execute({ ...bordas, min: 3, max: 1 })).rejects.toThrow(ValidationError);
  });

  it('recusa grupo sem nenhuma opção', async () => {
    await expect(salvar.execute({ ...bordas, options: [] })).rejects.toThrow(ValidationError);
  });

  it('recusa preço negativo', async () => {
    await expect(
      salvar.execute({ ...bordas, options: [{ name: 'Catupiry', priceReais: -1 }] }),
    ).rejects.toThrow(ValidationError);
  });

  it('aceita preço zero — a base do açaí é obrigatória e não cobra', async () => {
    const grupo = await salvar.execute({
      name: 'Base',
      min: 1,
      max: 1,
      options: [{ name: 'Açaí', priceReais: 0 }, { name: 'Misto', priceReais: 0 }],
    });

    expect(grupo.options.every((o) => o.price.cents === 0)).toBe(true);
    expect(grupo.min).toBe(1);
  });

  it('editar mantém o id e troca as opções', async () => {
    const criado = await salvar.execute(bordas);

    const editado = await salvar.execute({
      ...bordas,
      id: criado.id,
      options: [{ name: 'Catupiry', priceReais: 17.9 }],
    });

    expect(editado.id).toBe(criado.id);
    expect(editado.options).toHaveLength(1);
    expect(editado.options[0].price.reais).toBe(17.9);
  });
});

describe('anexar a produtos', () => {
  it('define os grupos de um produto na ordem dada', async () => {
    const a = await salvar.execute({ ...bordas, name: 'Massas' });
    const b = await salvar.execute(bordas);

    await uow.run((r) => r.optionGroups.setForProduct('p1', [a.id, b.id]));

    const grupos = await uow.run((r) => r.optionGroups.forProduct('p1'));
    expect(grupos.map((g) => g.name)).toEqual(['Massas', 'Borda']);
  });
});
