import { describe, expect, it } from 'vitest';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';

/**
 * Quão boa é a rota que entregamos.
 *
 * O roteirizador é o carro-chefe do produto, e "parece certo" não é resposta:
 * uma rota 14% pior que a ótima é invisível para quem a recebe — o motoboy sai,
 * entrega tudo, e ninguém descobre os cinco minutos perdidos.
 *
 * Estes testes comparam com a rota COMPROVADAMENTE ótima, obtida por força
 * bruta. Só dá para fazer isso com poucas paradas, mas é justamente o tamanho
 * de uma leva de moto.
 */
function custo(ordem: number[], m: number[][]): number {
  let t = m[0][ordem[0]];
  for (let i = 0; i < ordem.length - 1; i++) t += m[ordem[i]][ordem[i + 1]];
  return t + m[ordem[ordem.length - 1]][0];
}

function permutacoes(xs: number[]): number[][] {
  if (xs.length <= 1) return [xs];
  const out: number[][] = [];
  for (let i = 0; i < xs.length; i++) {
    const resto = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutacoes(resto)) out.push([xs[i], ...p]);
  }
  return out;
}

/** Semente fixa: teste de qualidade que oscila entre execuções não serve. */
function gerador(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

/**
 * Matriz assimétrica de propósito.
 *
 * Mão única, contramão e conversão proibida fazem ir de A para B custar
 * diferente de B para A. Testar com matriz simétrica esconderia exatamente a
 * classe de erro que o atalho clássico do 2-opt introduz.
 */
function matriz(n: number, rand: () => number): number[][] {
  const pontos = Array.from({ length: n + 1 }, () => ({ x: rand() * 100, y: rand() * 100 }));
  return pontos.map((a, i) =>
    pontos.map((b, j) => {
      if (i === j) return 0;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      return Math.round(d * (1 + (i < j ? 0 : rand() * 0.35)) * 60);
    }),
  );
}

describe('qualidade contra o ótimo real', () => {
  it.each([5, 6, 7, 8])('acha o ótimo em quase todo caso com %i paradas', (n) => {
    const rand = gerador(1234 + n);
    const opt = new TwoOptOptimizer();

    let otimos = 0;
    let piorGap = 0;
    const casos = 60;

    for (let c = 0; c < casos; c++) {
      const m = matriz(n, rand);
      const meu = opt.optimize(m).totalDurationSeconds;

      const melhor = permutacoes(Array.from({ length: n }, (_, i) => i + 1)).reduce(
        (min, p) => Math.min(min, custo(p, m)),
        Infinity,
      );

      if (meu <= melhor + 1e-9) otimos++;
      piorGap = Math.max(piorGap, (meu - melhor) / melhor);
    }

    /*
     * Os limites são folgados de propósito: apertá-los até o resultado de hoje
     * faria o teste quebrar por ruído, e teste que quebra sozinho é teste que
     * alguém desliga. O que ele protege é a ordem de grandeza — antes das
     * múltiplas partidas, o pior caso era 14%.
     */
    expect(otimos / casos).toBeGreaterThan(0.95);
    expect(piorGap).toBeLessThan(0.03);
  });
});

describe('determinismo', () => {
  it('a mesma leva produz sempre a mesma rota', () => {
    /*
     * As partidas aleatórias usam semente derivada do tamanho, não do relógio.
     * Sem isso, replanejar a mesma rota devolveria uma ordem diferente e o dono
     * não saberia se o sistema mudou de ideia ou se ele viu errado.
     */
    const m = matriz(8, gerador(99));
    const opt = new TwoOptOptimizer();

    const a = opt.optimize(m);
    const b = opt.optimize(m);

    expect(a.order).toEqual(b.order);
    expect(a.totalDurationSeconds).toBe(b.totalDurationSeconds);
  });
});

describe('custo em tempo', () => {
  it('uma leva grande continua abaixo de 100 ms', () => {
    // O planejamento acontece com o dono esperando na tela.
    const m = matriz(25, gerador(7));
    const opt = new TwoOptOptimizer();

    const inicio = performance.now();
    opt.optimize(m);

    expect(performance.now() - inicio).toBeLessThan(100);
  });
});
