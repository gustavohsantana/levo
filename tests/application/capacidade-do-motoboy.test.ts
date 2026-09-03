import { describe, expect, it } from 'vitest';
import { SaveCourier } from '@/application/use-cases/couriers/save-courier';
import { InMemoryDatabase, InMemoryUnitOfWork, SequentialIds } from '@/infrastructure/fakes/in-memory';
import { PIZZARIA } from '../helpers/fixtures';

/**
 * Quantos pedidos cada entregador leva por viagem.
 *
 * Era 15 fixo no código, igual para todo mundo — e não é: quem entrega de carro
 * leva mais, de bicicleta leva bem menos, e o baú da marmitaria não comporta o
 * mesmo número que o da lanchonete.
 */
function salvar(db: InMemoryDatabase, seq = 'c') {
  return new SaveCourier(new InMemoryUnitOfWork(db), new SequentialIds(seq), PIZZARIA.id);
}

describe('capacidade do entregador', () => {
  it('nasce com 15, que é o comportamento de quem já usava', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    const c = await salvar(db).execute({ name: 'Jefferson', phone: '35999990001' });

    expect(c.maxStops).toBe(15);
  });

  it('o dono ajusta para o veículo real', async () => {
    const db = new InMemoryDatabase(PIZZARIA);
    const c = await salvar(db).execute({
      name: 'Bruno da bicicleta',
      phone: '35999990002',
      maxStops: 4,
    });

    expect(c.maxStops).toBe(4);
  });

  it('trocar o telefone não apaga a capacidade configurada', async () => {
    /*
     * O construtor tem valor padrão, então montar o motoboy sem a capacidade
     * devolveria 15 — e uma edição de nome apagaria em silêncio o ajuste do dono.
     */
    const db = new InMemoryDatabase(PIZZARIA);
    const criado = await salvar(db).execute({
      name: 'Bruno',
      phone: '35999990002',
      maxStops: 4,
    });

    const editado = await salvar(db, 'c2').execute({
      id: criado.id,
      name: 'Bruno Silva',
      phone: '35988887777',
    });

    expect(editado.maxStops).toBe(4);
    expect(editado.name).toBe('Bruno Silva');
  });
});
