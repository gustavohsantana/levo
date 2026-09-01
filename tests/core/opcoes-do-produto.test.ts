import { describe, expect, it } from 'vitest';
import { Money, ValidationError } from '@/core';
import {
  nomesDaSelecao,
  precoDaSelecao,
  precoMinimo,
  validarSelecao,
  type OptionGroupSpec,
} from '@/core/services/option-selection';

/**
 * Os numeros aqui sao de tres lojas reais de Pouso Alegre, conferidos na tela
 * do iFood e do aiqfome. Valor inventado prova que a funcao soma; valor real
 * prova que ela soma o que o mercado cobra.
 */
function opcao(id: string, name: string, reais: number) {
  return { id, name, price: Money.fromReais(reais) };
}

/** Pizza Prime — Grande 35cm: sabor vendido como METADE, escolhe 2. */
const sabores35: OptionGroupSpec = {
  id: 'g-sabores',
  name: 'Escolha a sua pizza com até 2 sabores',
  min: 2,
  max: 2,
  options: [
    opcao('paulistana', '1/2 Calabresa Paulistana', 42.95),
    opcao('napolitana', '1/2 Napolitana', 46.45),
    opcao('palmito', '1/2 Palmito Especiale', 60.95),
    opcao('camarao', '1/2 Camarão Poró', 66.45),
  ],
};

const borda35: OptionGroupSpec = {
  id: 'g-borda',
  name: 'Selecione a borda da sua Pizza (35cm)',
  min: 0,
  max: 1,
  options: [opcao('catupiry', 'Borda Catupiry', 15.9), opcao('cheddar', 'Borda Cheddar', 15.9)],
};

/** Açaí da Toca — 200ml: base obrigatória e de graça. */
const baseAcai: OptionGroupSpec = {
  id: 'g-base',
  name: 'Base',
  min: 1,
  max: 1,
  options: [opcao('acai', 'Açaí', 0), opcao('ninho', 'Creme de Ninho', 0), opcao('misto', 'Misto', 0)],
};

const frutas: OptionGroupSpec = {
  id: 'g-frutas',
  name: 'Frutas',
  min: 0,
  max: 3,
  options: [opcao('banana', 'Banana', 5), opcao('morango', 'Morango', 6)],
};

describe('"a partir de" do cardápio', () => {
  it('pizza grande: o dobro da metade mais barata', () => {
    // A Pizza Prime anuncia "a partir de R$ 85,90". 42,95 × 2.
    const minimo = precoMinimo(Money.zero(), [sabores35, borda35]);

    expect(minimo.reais).toBe(85.9);
  });

  it('açaí: o preço-base, porque a escolha obrigatória não cobra', () => {
    // O copo de 200ml custa R$ 13,00 e a base — açaí, ninho ou misto — é grátis.
    const minimo = precoMinimo(Money.fromReais(13), [baseAcai, frutas]);

    expect(minimo.reais).toBe(13);
  });

  it('marmitex: sem grupo nenhum, o preço é o do produto', () => {
    expect(precoMinimo(Money.fromReais(30), []).reais).toBe(30);
  });
});

describe('preço da escolha', () => {
  it('pizza meio a meio: soma as duas metades', () => {
    // Foi o que o botao "Adicionar" mostrou: 46,45 + 60,95 = 107,40.
    const preco = precoDaSelecao(Money.zero(), [sabores35, borda35], {
      'g-sabores': ['napolitana', 'palmito'],
    });

    expect(preco.reais).toBe(107.4);
  });

  it('a borda soma por cima das metades', () => {
    const preco = precoDaSelecao(Money.zero(), [sabores35, borda35], {
      'g-sabores': ['napolitana', 'palmito'],
      'g-borda': ['catupiry'],
    });

    expect(preco.reais).toBe(123.3);
  });

  it('açaí: base grátis mais os adicionais', () => {
    const preco = precoDaSelecao(Money.fromReais(13), [baseAcai, frutas], {
      'g-base': ['misto'],
      'g-frutas': ['banana', 'morango'],
    });

    expect(preco.reais).toBe(24);
  });
});

describe('validação', () => {
  it('recusa pizza sem os dois sabores', () => {
    expect(() => validarSelecao([sabores35], { 'g-sabores': ['napolitana'] })).toThrow(
      ValidationError,
    );
  });

  it('recusa mais sabores que o permitido', () => {
    expect(() =>
      validarSelecao([sabores35], { 'g-sabores': ['napolitana', 'palmito', 'camarao'] }),
    ).toThrow(ValidationError);
  });

  it('recusa açaí sem base — obrigatória mesmo custando zero', () => {
    expect(() => validarSelecao([baseAcai], {})).toThrow(ValidationError);
  });

  it('aceita nenhuma fruta: o grupo é opcional', () => {
    expect(() => validarSelecao([frutas], {})).not.toThrow();
  });

  /*
   * Quem manda o pedido pode ser qualquer coisa, nao so a nossa tela. Uma opcao
   * inventada com preco zero seria pizza de graca.
   */
  it('recusa opção que não existe no grupo', () => {
    expect(() =>
      validarSelecao([sabores35], { 'g-sabores': ['napolitana', 'sabor-inventado'] }),
    ).toThrow(ValidationError);
  });
});

describe('o que a cozinha lê', () => {
  it('devolve os nomes escolhidos, na ordem dos grupos', () => {
    const nomes = nomesDaSelecao([sabores35, borda35], {
      'g-sabores': ['napolitana', 'palmito'],
      'g-borda': ['catupiry'],
    });

    expect(nomes).toEqual(['1/2 Napolitana', '1/2 Palmito Especiale', 'Borda Catupiry']);
  });
});
