import { describe, expect, it } from 'vitest';
import { TwoOptOptimizer } from '@/infrastructure/routing/two-opt-optimizer';
import { baselineDuration } from '@/infrastructure/routing/baseline';
import { countCrossings, euclideanMatrix, type Point } from '../helpers/geometry';
import { ValidationError } from '@/core';

const optimizer = new TwoOptOptimizer();

describe('TwoOptOptimizer', () => {
  it('não cruza a própria rota em um polígono regular', () => {
    // 10 paradas num círculo, embaralhadas: o pior caso possível para quem
    // sai na ordem de chegada, e o melhor caso para mostrar o 2-opt agindo.
    const origin: Point = { x: 0, y: 0 };
    const ring: Point[] = Array.from({ length: 10 }, (_, index) => {
      const angle = (2 * Math.PI * index) / 10;
      return { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
    });

    const scrambled = [ring[0], ring[5], ring[2], ring[8], ring[1], ring[6], ring[3], ring[9], ring[4], ring[7]];
    const points = [origin, ...scrambled];

    const { order } = optimizer.optimize(euclideanMatrix(points));

    expect(countCrossings(points, [0, ...order])).toBe(0);
  });

  it('nunca sai pior que a ordem de chegada dos pedidos', () => {
    // A promessa feita ao dono do estabelecimento: no mínimo empata.
    for (let seed = 1; seed <= 40; seed++) {
      const points: Point[] = [{ x: 0, y: 0 }];
      let random = seed;
      for (let i = 0; i < 9; i++) {
        random = (random * 1103515245 + 12345) % 2147483648;
        const x = (random % 2000) / 10 - 100;
        random = (random * 1103515245 + 12345) % 2147483648;
        const y = (random % 2000) / 10 - 100;
        points.push({ x, y });
      }

      const matrix = euclideanMatrix(points);
      const optimized = optimizer.optimize(matrix).totalDurationSeconds;

      expect(optimized).toBeLessThanOrEqual(baselineDuration(matrix) + 1e-9);
    }
  });

  it('visita cada parada exatamente uma vez', () => {
    const matrix = euclideanMatrix([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 20 },
    ]);

    const { order } = optimizer.optimize(matrix);

    expect([...order].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('respeita assimetria de mão única', () => {
    // Ir 0→1 é caro, mas 1→0 é barato: numa matriz simétrica o otimizador
    // erraria a ordem. Este é o teste que pega o atalho do 2-opt de livro.
    const matrix = [
      [0, 100, 1, 1],
      [1, 0, 100, 100],
      [100, 1, 0, 100],
      [1, 100, 100, 0],
    ];

    const { order, totalDurationSeconds } = optimizer.optimize(matrix);

    // Melhor ciclo: 0→3→... não fecha bem; a busca precisa achar 0→2→1→... etc.
    // O que garantimos é que o custo relatado bate com o percurso devolvido.
    let recomputed = matrix[0][order[0]];
    for (let i = 0; i < order.length - 1; i++) recomputed += matrix[order[i]][order[i + 1]];
    recomputed += matrix[order[order.length - 1]][0];

    expect(totalDurationSeconds).toBe(recomputed);
  });

  it('encontra o ótimo conhecido em instância pequena', () => {
    // Quadrado: o ciclo ótimo é o perímetro (40), nunca as diagonais.
    const matrix = euclideanMatrix([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);

    expect(optimizer.optimize(matrix).totalDurationSeconds).toBeCloseTo(40, 6);
  });

  it('lida com rota de uma parada só', () => {
    const result = optimizer.optimize([
      [0, 30],
      [30, 0],
    ]);

    expect(result.order).toEqual([1]);
    expect(result.totalDurationSeconds).toBe(60); // ida e volta
  });

  it('recusa endereço inalcançável em vez de mandar o motoboy para o limbo', () => {
    const matrix = [
      [0, Infinity],
      [Infinity, 0],
    ];

    expect(() => optimizer.optimize(matrix)).toThrow(ValidationError);
  });

  it('recusa matriz não quadrada', () => {
    expect(() => optimizer.optimize([[0, 1], [1]])).toThrow(ValidationError);
  });

  it('não força volta à origem quando desligado', () => {
    const openRoute = new TwoOptOptimizer({ returnToOrigin: false });

    expect(openRoute.optimize([[0, 30], [30, 0]]).totalDurationSeconds).toBe(30);
  });
});
