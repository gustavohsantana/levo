import { beforeEach, describe, expect, it } from 'vitest';
import { SaveCourier } from '@/application/use-cases/couriers/save-courier';
import { SetCourierActive } from '@/application/use-cases/couriers/set-courier-active';
import {
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import { NotFoundError, ValidationError } from '@/core';
import { newDatabase } from '../helpers/fixtures';

/**
 * O cadastro do entregador é curto porque só duas coisas importam: o nome, para
 * o dono escolher na hora de despachar, e o telefone, que é por onde a rota
 * chega. Sem telefone o entregador existe e não recebe trabalho.
 */
let db: InMemoryDatabase;
let salvar: SaveCourier;
let alternar: SetCourierActive;

beforeEach(() => {
  db = newDatabase();
  const uow = new InMemoryUnitOfWork(db);
  salvar = new SaveCourier(uow, new SequentialIds('c'), 'est-1');
  alternar = new SetCourierActive(uow);
});

describe('entregadores', () => {
  it('cadastra com nome e telefone', async () => {
    const courier = await salvar.execute({ name: '  Rodrigo  ', phone: '35999887766' });

    expect(courier.name).toBe('Rodrigo');
    expect(courier.active).toBe(true);
    expect(db.couriers.get(courier.id)).toBeDefined();
  });

  it('recusa telefone inválido', async () => {
    // Telefone quebrado não é detalhe de contato: é a rota que não chega.
    await expect(salvar.execute({ name: 'Sem telefone', phone: '123' })).rejects.toThrow(
      ValidationError,
    );
  });

  it('edita sem criar um segundo cadastro', async () => {
    const criado = await salvar.execute({ name: 'Rodrigo', phone: '35999887766' });

    const editado = await salvar.execute({
      id: criado.id,
      name: 'Rodrigo Alves',
      phone: '35988776655',
    });

    expect(editado.id).toBe(criado.id);
    expect(editado.name).toBe('Rodrigo Alves');
    expect([...db.couriers.values()].filter((c) => c.id === criado.id)).toHaveLength(1);
  });

  it('recusa editar quem não existe', async () => {
    await expect(
      salvar.execute({ id: 'fantasma', name: 'Ninguém', phone: '35999887766' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('pausa e reativa sem apagar o cadastro', async () => {
    // Apagar deixaria rotas antigas sem dono e sumiria com o histórico dele.
    const courier = await salvar.execute({ name: 'Rodrigo', phone: '35999887766' });

    await alternar.execute(courier.id, false);
    expect(db.couriers.get(courier.id)!.active).toBe(false);

    await alternar.execute(courier.id, true);
    expect(db.couriers.get(courier.id)!.active).toBe(true);
  });
});
