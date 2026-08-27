import { describe, expect, it } from 'vitest';
import { Money, taxaPorDistancia } from '@/core';

/**
 * "Até 3 km, R$ 5. Até 6 km, R$ 8. Acima, R$ 12."
 *
 * É como o setor precifica frete, e hoje isso vive na cabeça de quem atende —
 * que erra no sábado cheio, sempre para menos.
 */
const FAIXAS = [
  { uptoMeters: 3_000, fee: Money.fromReais(5) },
  { uptoMeters: 6_000, fee: Money.fromReais(8) },
  { uptoMeters: 10_000, fee: Money.fromReais(12) },
];

const PADRAO = Money.fromReais(7);

describe('taxa por distância', () => {
  it('usa a primeira faixa que alcança', () => {
    expect(taxaPorDistancia(1_200, FAIXAS, PADRAO).cents).toBe(5_00);
    expect(taxaPorDistancia(4_500, FAIXAS, PADRAO).cents).toBe(8_00);
    expect(taxaPorDistancia(9_000, FAIXAS, PADRAO).cents).toBe(12_00);
  });

  it('inclui o limite na própria faixa', () => {
    // "Até 3 km" precisa cobrar 3 km. Deixar o limite de fora criaria um vão
    // onde o cliente exatamente na fronteira paga a faixa de cima.
    expect(taxaPorDistancia(3_000, FAIXAS, PADRAO).cents).toBe(5_00);
  });

  it('cobra a última faixa quando ninguém alcança', () => {
    // Cliente mais longe que tudo o que foi cadastrado. Recusar o pedido ou
    // entregar de graça seriam as duas piores respostas.
    expect(taxaPorDistancia(50_000, FAIXAS, PADRAO).cents).toBe(12_00);
  });

  it('devolve a taxa fixa quando não há faixa nenhuma', () => {
    // Quem não cobra por distância não precisa saber que isso existe.
    expect(taxaPorDistancia(4_000, [], PADRAO).cents).toBe(7_00);
  });

  it('não depende da ordem em que as faixas vieram', () => {
    const bagunçadas = [FAIXAS[2], FAIXAS[0], FAIXAS[1]];

    expect(taxaPorDistancia(4_500, bagunçadas, PADRAO).cents).toBe(8_00);
  });

  it('trata distância zero como a faixa mais barata', () => {
    // Cliente na porta do restaurante — acontece com retirada mal cadastrada.
    expect(taxaPorDistancia(0, FAIXAS, PADRAO).cents).toBe(5_00);
  });
});
