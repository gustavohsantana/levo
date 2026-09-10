import { describe, expect, it } from 'vitest';
import {
  fecharPagamento,
  valorDaFaixa,
  type CourierPayAgreement,
  type EntregaFeita,
} from '@/core/services/courier-pay';
import { Money } from '@/core';

/**
 * O fechamento do motoboy.
 *
 * É dinheiro que sai da mão de uma pessoa para a de outra no fim da semana:
 * errar aqui é errar o salário de alguém, e o erro só aparece quando ele
 * reclama.
 */
const acordo = (over: Partial<CourierPayAgreement> = {}): CourierPayAgreement => ({
  model: 'POR_ENTREGA',
  perDelivery: Money.fromCents(700),
  daily: Money.fromCents(0),
  bands: [],
  ...over,
});

const entrega = (meters: number, dia: string): EntregaFeita => ({ meters, dia });

describe('por entrega', () => {
  it('multiplica pelo número de corridas', () => {
    const f = fecharPagamento(
      [entrega(1000, '2026-09-01'), entrega(9000, '2026-09-01')],
      acordo(),
    );

    // A distância não importa neste acordo: R$ 7 a corrida, perto ou longe.
    expect(f.totalCents).toBe(1400);
    expect(f.diariasCents).toBe(0);
  });
});

describe('por faixa', () => {
  const comFaixas = acordo({
    model: 'POR_FAIXA',
    bands: [
      { uptoMeters: 3000, amount: Money.fromCents(700) },
      { uptoMeters: 6000, amount: Money.fromCents(1000) },
    ],
  });

  it('cobra a faixa que alcança a distância', () => {
    expect(valorDaFaixa(2500, comFaixas.bands).cents).toBe(700);
    expect(valorDaFaixa(3000, comFaixas.bands).cents).toBe(700);
    expect(valorDaFaixa(3001, comFaixas.bands).cents).toBe(1000);
  });

  it('mais longe que tudo vale a última faixa', () => {
    // Pagar zero por uma entrega que aconteceu seria a pior resposta possível.
    expect(valorDaFaixa(20000, comFaixas.bands).cents).toBe(1000);
  });

  it('soma faixa a faixa', () => {
    const f = fecharPagamento(
      [entrega(1000, '2026-09-01'), entrega(5000, '2026-09-01'), entrega(30000, '2026-09-01')],
      comFaixas,
    );

    expect(f.totalCents).toBe(700 + 1000 + 1000);
  });
});

describe('diária mais entrega', () => {
  const fixo = acordo({
    model: 'DIARIA_E_ENTREGA',
    perDelivery: Money.fromCents(400),
    daily: Money.fromCents(7000),
  });

  it('conta uma diária por dia rodado, não por dia do período', () => {
    const f = fecharPagamento(
      [
        entrega(1000, '2026-09-01'),
        entrega(1000, '2026-09-01'),
        entrega(1000, '2026-09-03'),
      ],
      fixo,
    );

    // Dois dias rodados, três corridas: quem folgou na quarta não recebe por ela.
    expect(f.diasRodados).toBe(2);
    expect(f.diariasCents).toBe(14000);
    expect(f.porEntregaCents).toBe(1200);
    expect(f.totalCents).toBe(15200);
  });

  it('sem entrega nenhuma não paga diária', () => {
    const f = fecharPagamento([], fixo);
    expect(f.totalCents).toBe(0);
    expect(f.diasRodados).toBe(0);
  });
});

describe('diária mais faixa', () => {
  const comFaixa = acordo({
    model: 'DIARIA_E_FAIXA',
    daily: Money.fromCents(7000),
    bands: [
      { uptoMeters: 3000, amount: Money.fromCents(700) },
      { uptoMeters: 6000, amount: Money.fromCents(1000) },
    ],
  });

  it('soma a diária por dia rodado ao valor da faixa de cada corrida', () => {
    const f = fecharPagamento(
      [
        entrega(1000, '2026-09-01'), // faixa de R$ 7
        entrega(5000, '2026-09-01'), // faixa de R$ 10
        entrega(30000, '2026-09-03'), // acima de tudo: última faixa, R$ 10
      ],
      comFaixa,
    );

    // Dois dias rodados => duas diárias; as corridas pagam pela distância.
    expect(f.diasRodados).toBe(2);
    expect(f.diariasCents).toBe(14000);
    expect(f.porEntregaCents).toBe(700 + 1000 + 1000);
    expect(f.totalCents).toBe(14000 + 2700);
  });

  it('diária garantida sozinha ainda é acordo, mesmo sem faixa cadastrada', () => {
    // Combinou só o garantido por dia; as faixas ele preenche depois. Não é
    // "sem acordo" — o motoboy tem, sim, o que receber.
    const f = fecharPagamento(
      [entrega(1000, '2026-09-01')],
      acordo({ model: 'DIARIA_E_FAIXA', daily: Money.fromCents(7000), bands: [] }),
    );

    expect(f.semAcordo).toBe(false);
    expect(f.diariasCents).toBe(7000);
    expect(f.porEntregaCents).toBe(0);
  });

  it('sem faixa e sem diária é acordo em branco', () => {
    const f = fecharPagamento(
      [entrega(1000, '2026-09-01')],
      acordo({ model: 'DIARIA_E_FAIXA', daily: Money.fromCents(0), bands: [] }),
    );

    expect(f.semAcordo).toBe(true);
    expect(f.totalCents).toBe(0);
  });
});

describe('acordo não combinado', () => {
  it('avisa em vez de fingir que o motoboy não tem nada a receber', () => {
    const f = fecharPagamento([entrega(1000, '2026-09-01')], acordo({ perDelivery: Money.fromCents(0) }));

    expect(f.semAcordo).toBe(true);
    expect(f.totalCents).toBe(0);
  });

  it('faixa sem nenhuma linha também é acordo em branco', () => {
    const f = fecharPagamento(
      [entrega(1000, '2026-09-01')],
      acordo({ model: 'POR_FAIXA', bands: [] }),
    );

    expect(f.semAcordo).toBe(true);
  });

  it('acordo preenchido não dispara o aviso', () => {
    const f = fecharPagamento([entrega(1000, '2026-09-01')], acordo());
    expect(f.semAcordo).toBe(false);
  });
});
