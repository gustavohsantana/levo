import { describe, expect, it } from 'vitest';
import { agruparPorUso, gruposDaCategoria } from '@/presentation/ui/patterns/option-group-layout';
import type { OptionGroupView, ProductView } from '@/presentation/queries';

function grupo(id: string, name: string, produtos = 1): OptionGroupView {
  return { id, name, min: 0, max: 1, options: [{ id: `${id}-o`, name: 'X', priceCents: 0 }], produtos };
}

function produto(
  id: string,
  category: string | null,
  optionGroupIds: string[],
): ProductView {
  return {
    id,
    optionGroupIds,
    name: id,
    description: null,
    priceCents: 0,
    category,
    imageUrl: null,
    active: true,
    source: 'MANUAL',
    importado: false,
  };
}

describe('agruparPorUso', () => {
  it('separa pizza de açaí e deixa órfão no fim', () => {
    const sabor = grupo('g1', 'Sabores 35cm', 1);
    const frutas = grupo('g2', 'Frutas', 1);
    const orfao = grupo('g3', 'Talheres', 0);

    const secoes = agruparPorUso(
      [sabor, frutas, orfao],
      [
        produto('p1', 'Pizzas', ['g1']),
        produto('p2', 'Açaí', ['g2']),
      ],
      ['Pizzas', 'Açaí'],
    );

    expect(secoes.map((s) => s.categoria)).toEqual(['Pizzas', 'Açaí', 'Ainda sem produto']);
    expect(secoes[0].grupos.map((g) => g.name)).toEqual(['Sabores 35cm']);
    expect(secoes[1].grupos.map((g) => g.name)).toEqual(['Frutas']);
    expect(secoes[2].grupos.map((g) => g.name)).toEqual(['Talheres']);
  });
});

describe('gruposDaCategoria', () => {
  it('em Doces só devolve o que Doces já usa', () => {
    const calda = grupo('g1', 'Calda');
    const frutas = grupo('g2', 'Frutas');

    const daCategoria = gruposDaCategoria(
      [calda, frutas],
      [
        produto('p1', 'Doces', ['g1']),
        produto('p2', 'Açaí', ['g2']),
      ],
      'Doces',
    );

    expect(daCategoria.map((g) => g.name)).toEqual(['Calda']);
  });

  it('categoria ainda sem opcional devolve vazio', () => {
    expect(
      gruposDaCategoria(
        [grupo('g1', 'Calda')],
        [produto('p1', 'Doces', [])],
        'Massas',
      ),
    ).toEqual([]);
  });
});
