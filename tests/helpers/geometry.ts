/** Utilitários só de teste, para provar propriedades geométricas da rota. */

export interface Point {
  x: number;
  y: number;
}

/** Matriz simétrica de distâncias euclidianas — mundo plano, sem mão única. */
export function euclideanMatrix(points: Point[]): number[][] {
  return points.map((from) =>
    points.map((to) => Math.hypot(from.x - to.x, from.y - to.y)),
  );
}

function orientation(a: Point, b: Point, c: Point): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  return (
    orientation(a, b, c) !== orientation(a, b, d) &&
    orientation(c, d, a) !== orientation(c, d, b)
  );
}

/**
 * Conta cruzamentos entre arestas não adjacentes do ciclo fechado.
 *
 * Num plano euclidiano, a rota ótima **nunca** se cruza: se duas arestas se
 * cruzam, trocá-las por outras duas encurta o caminho. É exatamente o que o
 * 2-opt existe para desfazer — então zero cruzamentos é a prova visual de que
 * ele está fazendo o trabalho.
 */
export function countCrossings(points: Point[], cycle: number[]): number {
  const edges: Array<[Point, Point]> = [];
  for (let i = 0; i < cycle.length; i++) {
    const from = points[cycle[i]];
    const to = points[cycle[(i + 1) % cycle.length]];
    edges.push([from, to]);
  }

  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === edges.length - 1);
      if (adjacent) continue;
      if (segmentsCross(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) crossings++;
    }
  }
  return crossings;
}
