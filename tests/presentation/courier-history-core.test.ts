import { describe, expect, it } from 'vitest';
import { Money } from '@/core';
import type { CourierPayAgreement } from '@/core/services/courier-pay';
import { resumirDia, type EntregaDoDia } from '@/presentation/courier-history-core';

function entrega(over: Partial<EntregaDoDia> = {}): EntregaDoDia {
  return {
    quando: '2026-09-22T18:00:00.000Z',
    cliente: 'Cliente',
    endereco: 'Rua Um, 10',
    metros: 1000,
    valorCents: 5000,
    ...over,
  };
}

const porEntrega: CourierPayAgreement = {
  model: 'POR_ENTREGA',
  perDelivery: Money.fromCents(500),
  daily: Money.fromCents(0),
  bands: [],
};

describe('resumirDia', () => {
  it('soma o ganho pelo acordo por entrega e conta as entregas', () => {
    const resumo = resumirDia('2026-09-22', [entrega(), entrega(), entrega()], porEntrega);

    expect(resumo.entregas).toBe(3);
    expect(resumo.ganhoCents).toBe(1500);
    expect(resumo.semAcordo).toBe(false);
    expect(resumo.metrosTotais).toBe(3000);
  });

  it('conta a diária uma vez no dia, além do valor por entrega', () => {
    const diariaEEntrega: CourierPayAgreement = {
      model: 'DIARIA_E_ENTREGA',
      perDelivery: Money.fromCents(300),
      daily: Money.fromCents(5000),
      bands: [],
    };

    const resumo = resumirDia('2026-09-22', [entrega(), entrega()], diariaEEntrega);

    // 2 × R$3 + 1 diária de R$50 = R$56.
    expect(resumo.ganhoCents).toBe(5600);
    expect(resumo.semAcordo).toBe(false);
  });

  it('marca sem acordo quando não há de onde tirar centavo', () => {
    const semNada: CourierPayAgreement = {
      model: 'POR_ENTREGA',
      perDelivery: Money.fromCents(0),
      daily: Money.fromCents(0),
      bands: [],
    };

    const resumo = resumirDia('2026-09-22', [entrega()], semNada);

    expect(resumo.entregas).toBe(1);
    expect(resumo.ganhoCents).toBe(0);
    expect(resumo.semAcordo).toBe(true);
  });

  it('dia sem entrega: zera tudo e não quebra sem acordo', () => {
    const resumo = resumirDia('2026-09-22', [], null);

    expect(resumo.entregas).toBe(0);
    expect(resumo.ganhoCents).toBe(0);
    expect(resumo.metrosTotais).toBe(0);
    expect(resumo.semAcordo).toBe(true);
    expect(resumo.itens).toEqual([]);
  });

  it('tolera entrega sem distância conhecida', () => {
    const resumo = resumirDia('2026-09-22', [entrega({ metros: null })], porEntrega);

    expect(resumo.metrosTotais).toBe(0);
    expect(resumo.ganhoCents).toBe(500);
  });
});
