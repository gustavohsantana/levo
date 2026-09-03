import { describe, expect, it } from 'vitest';
import { compararPrioridade, recomendar } from '@/core/services/prioridade-na-rota';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';

/**
 * O que custa adiantar um pedido urgente.
 *
 * "Urgente" não pode significar "vai primeiro". O caminho até ele já passa pelos
 * outros — entregar de passagem custa só o tempo parado, e pular todos economiza
 * quase nada porque o percurso é o mesmo.
 */
const otimizador = new TwoOptOptimizer();
const MIN = 60;

/** Matriz a partir de posições numa reta, em minutos de deslocamento. */
function emLinha(minutos: number[]) {
  return minutos.map((a) => minutos.map((b) => Math.abs(a - b) * MIN));
}

describe('quando o urgente já está no caminho', () => {
  it('recomenda manter, porque adiantar quase não ajuda e atrapalha muito', () => {
    /*
     * Quatro paradas em linha reta, 5 min entre cada. O urgente é a última.
     * Medido: adiantar ganha 6 min para ele e custa 32 a cada um dos outros.
     */
    const c = compararPrioridade(emLinha([0, 5, 10, 15, 20]), 4, otimizador);

    expect(c.recomendacao).toBe('MANTER');
    expect(c.ganhoDoUrgente / MIN).toBeLessThan(10);
    expect(c.atrasoMedioDosOutros / MIN).toBeGreaterThanOrEqual(20);
  });

  it('o urgente no meio do corredor não move nada', () => {
    const c = compararPrioridade(emLinha([0, 5, 10, 15, 20]), 2, otimizador);

    expect(c.recomendacao).toBe('MANTER');
  });
});

describe('a regra de decisão', () => {
  it('adianta quando o urgente ganha mais do que os outros perdem', () => {
    // O cliente longe do corredor que estava por último: ganha 29 min, e cada
    // um dos outros perde 4.
    expect(recomendar(29 * MIN, 4 * MIN)).toBe('ADIANTAR');
  });

  it('mantém quando o estorvo supera o ganho', () => {
    // O caso medido: 6 min de ganho contra 32 de atraso para cada um.
    expect(recomendar(6 * MIN, 32 * MIN)).toBe('MANTER');
  });

  it('empate adianta — quem está esperando há mais tempo desempata', () => {
    expect(recomendar(10 * MIN, 10 * MIN)).toBe('ADIANTAR');
  });

  it('sem ganho não move, mesmo sem estorvo nenhum', () => {
    // Já é o primeiro, ou mover não muda nada: mexer seria só ruído.
    expect(recomendar(0, 0)).toBe('MANTER');
    expect(recomendar(-5 * MIN, 0)).toBe('MANTER');
  });
});

describe('a comparação é honesta', () => {
  it('reotimiza o que sobra em vez de manter a ordem antiga', () => {
    /*
     * Mostrar um número pior que o alcançável enviesaria a recomendação para
     * "manter" — a ferramenta mentiria a favor da própria preguiça.
     */
    const c = compararPrioridade(emLinha([0, 5, 10, 15, 20]), 4, otimizador);

    expect(c.ordemAdiantada[0]).toBe(4);
    // Depois do urgente, o resto volta em ordem eficiente: 3, 2, 1.
    expect(c.ordemAdiantada).toEqual([4, 3, 2, 1]);
  });

  it('as duas rotas visitam exatamente as mesmas paradas', () => {
    const c = compararPrioridade(emLinha([0, 5, 10, 15, 20]), 3, otimizador);

    expect([...c.ordemAdiantada].sort()).toEqual([...c.ordemEconomica].sort());
  });

  it('uma parada só não tem o que comparar', () => {
    const c = compararPrioridade(emLinha([0, 7]), 1, otimizador);

    expect(c.ganhoDoUrgente).toBe(0);
    expect(c.atrasoMedioDosOutros).toBe(0);
    expect(c.recomendacao).toBe('MANTER');
  });
});
