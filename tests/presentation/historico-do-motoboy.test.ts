import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Money } from '@/core';
import type { CourierPayAgreement } from '@/core/services/courier-pay';
import {
  montarHistoricoDoDia,
  type EntregaConcluida,
  type HistoricoDoDia,
} from '@/presentation/historico-do-motoboy';
import { currency } from '@/presentation/ui/format';
import { HistoricoDoDia as Painel } from '@/presentation/ui/patterns/historico-do-dia';

/**
 * O dia do motoboy, em Brasília.
 *
 * 2026-09-02T02:30:00Z ainda é 23:30 do dia 1. A entrega das 22h entra em
 * "hoje"; a da 00:30 do dia seguinte, não. Errar o fuso joga o salário da noite
 * para o dia errado.
 */
const AGORA = new Date('2026-09-02T02:30:00Z');

const acordo = (over: Partial<CourierPayAgreement> = {}): CourierPayAgreement => ({
  model: 'POR_ENTREGA',
  perDelivery: Money.fromCents(700),
  daily: Money.fromCents(0),
  bands: [],
  ...over,
});

function painel(historico: HistoricoDoDia): string {
  return renderToStaticMarkup(createElement(Painel, { historico }));
}

function entrega(over: Partial<EntregaConcluida> = {}): EntregaConcluida {
  return {
    id: 'e-1',
    cliente: 'Maria',
    endereco: 'Rua das Flores, 100',
    quando: '2026-09-02T01:00:00.000Z',
    metros: 1200,
    ...over,
  };
}

describe('histórico do dia', () => {
  it('soma o que ele tem a receber nas entregas de hoje', () => {
    const historico = montarHistoricoDoDia(
      [
        entrega({ id: 'a', quando: '2026-09-02T00:10:00.000Z' }),
        entrega({ id: 'b', cliente: 'João', quando: '2026-09-02T01:40:00.000Z' }),
        entrega({ id: 'ontem', quando: '2026-08-31T15:00:00.000Z' }),
      ],
      acordo(),
      AGORA,
    );

    expect(historico.hoje).toBe('2026-09-01');
    expect(historico.linhas.map((l) => l.id)).toEqual(['b', 'a']);
    expect(historico.linhas.every((l) => l.aReceberCents === 700)).toBe(true);
    expect(historico.totalCents).toBe(1400);
    expect(historico.semAcordo).toBe(false);
    expect(historico.diariasCents).toBe(0);
  });

  it('soma faixa por corrida e a diária uma vez', () => {
    const historico = montarHistoricoDoDia(
      [
        entrega({ id: 'perto', metros: 2000, quando: '2026-09-02T00:00:00.000Z' }),
        entrega({ id: 'longe', metros: 8000, quando: '2026-09-02T01:00:00.000Z' }),
      ],
      acordo({
        model: 'DIARIA_E_FAIXA',
        daily: Money.fromCents(5000),
        bands: [
          { uptoMeters: 3000, amount: Money.fromCents(700) },
          { uptoMeters: 6000, amount: Money.fromCents(1000) },
        ],
      }),
      AGORA,
    );

    const porId = new Map(historico.linhas.map((l) => [l.id, l.aReceberCents]));
    expect(porId.get('perto')).toBe(700);
    expect(porId.get('longe')).toBe(1000);
    expect(historico.diariasCents).toBe(5000);
    expect(historico.totalCents).toBe(6700);
    expect(
      historico.linhas.reduce((t, l) => t + (l.aReceberCents ?? 0), 0) + historico.diariasCents,
    ).toBe(historico.totalCents);
  });

  it('fica vazio, sem valor, quando ele ainda não entregou hoje', () => {
    const historico = montarHistoricoDoDia(
      [entrega({ quando: '2026-08-31T12:00:00.000Z' })],
      acordo(),
      AGORA,
    );

    expect(historico.linhas).toEqual([]);
    expect(historico.totalCents).toBeNull();
    expect(historico.diariasCents).toBe(0);
    expect(historico.semAcordo).toBe(false);
  });

  it('não inventa valor quando o acordo não foi combinado', () => {
    const historico = montarHistoricoDoDia(
      [entrega()],
      acordo({ perDelivery: Money.fromCents(0) }),
      AGORA,
    );

    expect(historico.linhas).toHaveLength(1);
    expect(historico.linhas[0]?.aReceberCents).toBeNull();
    expect(historico.totalCents).toBeNull();
    expect(historico.semAcordo).toBe(true);
    expect(historico.diariasCents).toBe(0);
  });

  it('mostra a soma na tela e, no dia vazio, nenhum valor', () => {
    const vazio = montarHistoricoDoDia([], acordo(), AGORA);
    const htmlVazio = renderToStaticMarkup(createElement(Painel, { historico: vazio }));
    expect(htmlVazio).toContain('Nenhuma entrega hoje');
    expect(htmlVazio).not.toContain('R$');

    const cheio = montarHistoricoDoDia(
      [entrega({ id: 'a' }), entrega({ id: 'b', cliente: 'João' })],
      acordo(),
      AGORA,
    );
    const htmlCheio = painel(cheio);
    expect(htmlCheio).toContain('a receber hoje');
    expect(htmlCheio).toContain(currency(1400));
    expect(htmlCheio).toContain('Maria');
    expect(htmlCheio).toContain('João');

    const semAcordo = montarHistoricoDoDia(
      [entrega()],
      acordo({ perDelivery: Money.fromCents(0) }),
      AGORA,
    );
    const htmlSem = painel(semAcordo);
    expect(htmlSem).toContain('Maria');
    expect(htmlSem).toContain('ainda não combinou');
    expect(htmlSem).not.toContain('R$');
  });

  it('deixa de fora a entrega que virou o dia seguinte em Brasília', () => {
    const historico = montarHistoricoDoDia(
      [entrega({ quando: '2026-09-02T03:30:00.000Z' })],
      acordo(),
      AGORA,
    );

    expect(historico.linhas).toEqual([]);
    expect(historico.totalCents).toBeNull();
  });
});
