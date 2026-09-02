import type { OptimizedRoute, RouteOptimizer } from '@/core';
import { ValidationError } from '@/core';

interface Options {
  /**
   * O motoboy volta ao estabelecimento para pegar a próxima leva, então por
   * padrão otimizamos o ciclo fechado — é o que determina quando ele fica
   * livre de novo. Rotas de fim de expediente podem desligar isso.
   */
  returnToOrigin?: boolean;
  /** Trava de segurança: na prática converge em poucas passadas. */
  maxPasses?: number;
  /**
   * Quantas partidas diferentes tentar antes de escolher a melhor.
   *
   * Cada uma custa uma busca local completa. Com dez paradas isso é
   * sub-milissegundo — barato demais para não fazer, dado o que evita.
   */
  restarts?: number;
}

/**
 * Busca local sobre a matriz de tempos reais do roteirizador.
 *
 * Duas jogadas, alternadas até nenhuma delas melhorar:
 *
 *  - **2-opt**: inverte um trecho da rota. Desfaz cruzamentos — o ganho
 *    clássico, e o que mais aparece numa rota montada pela ordem de chegada
 *    dos pedidos.
 *  - **realocação (or-opt)**: tira uma parada e a reinsere em outro ponto.
 *    Resolve o caso que o 2-opt não alcança: um pedido de bairro distante que
 *    chegou no meio da leva e precisa ir para a ponta.
 *
 * ### Por que recalcular o custo inteiro em vez do delta
 *
 * O 2-opt de livro-texto avalia uma inversão somando duas arestas e subtraindo
 * duas — mas isso **só vale em matriz simétrica**. A nossa não é: mão única,
 * contramão e conversão proibida fazem ir de A para B custar diferente de B
 * para A, e inverter um trecho muda o custo de todas as arestas internas dele.
 * Usar o atalho aqui produziria rotas silenciosamente piores que o relatado.
 *
 * Então recalculamos o percurso todo a cada candidato: O(n³) por passada. Para
 * as ~10 paradas de uma leva real são poucos milhares de operações — sub-
 * milissegundo. Continua irrelevante até algo perto de 50 paradas, bem além do
 * que cabe num baú de moto.
 */
export class TwoOptOptimizer implements RouteOptimizer {
  private readonly returnToOrigin: boolean;
  private readonly maxPasses: number;
  private readonly restarts: number;

  constructor(options: Options = {}) {
    this.returnToOrigin = options.returnToOrigin ?? true;
    this.maxPasses = options.maxPasses ?? 50;
    this.restarts = options.restarts ?? 12;
  }

  optimize(matrix: number[][]): OptimizedRoute {
    this.assertSquare(matrix);

    const stopCount = matrix.length - 1;
    if (stopCount <= 0) return { order: [], totalDurationSeconds: 0 };
    if (stopCount === 1) return { order: [1], totalDurationSeconds: this.cost([1], matrix) };

    /*
     * Várias partidas, e fica a melhor.
     *
     * A busca local para no primeiro ótimo local que encontra, e o vizinho-mais-
     * próximo sempre a leva para o mesmo. Medido contra a rota comprovadamente
     * ótima (força bruta) em 800 casos: partida única acertava o ótimo em ~83%
     * das vezes, mas errava por até 14% no pior caso — cinco minutos e meio
     * jogados fora numa volta de quarenta, sem ninguém perceber.
     *
     * Partir de pontos diferentes cai em bacias diferentes. Não garante o ótimo
     * — nada garante, sem enumerar tudo —, mas os piores casos somem, que é o
     * que importa: rota média boa com uma péssima por semana é pior, para quem
     * confia no sistema, do que rota consistentemente boa.
     */
    let melhorTour = this.buscaLocal(this.nearestNeighbour(matrix), matrix);

    const sortear = this.geradorDeterministico(stopCount);
    for (let inicio = 0; inicio < this.restarts && stopCount > 3; inicio++) {
      const candidato = this.buscaLocal(this.embaralhar(stopCount, sortear), matrix);
      if (candidato.cost < melhorTour.cost) melhorTour = candidato;
    }

    return { order: melhorTour.tour, totalDurationSeconds: melhorTour.cost };
  }

  /** 2-opt e realocação alternados até nenhum dos dois melhorar. */
  private buscaLocal(inicial: number[], matrix: number[][]): { tour: number[]; cost: number } {
    let tour = inicial;
    let bestCost = this.cost(tour, matrix);

    for (let pass = 0; pass < this.maxPasses; pass++) {
      const afterReversal = this.bestReversal(tour, matrix, bestCost);
      const afterRelocation = this.bestRelocation(afterReversal.tour, matrix, afterReversal.cost);

      // Nenhuma das duas jogadas melhorou: é um ótimo local, para aqui.
      if (afterRelocation.cost >= bestCost) break;

      tour = afterRelocation.tour;
      bestCost = afterRelocation.cost;
    }

    return { tour, cost: bestCost };
  }

  /**
   * Sorteio determinístico, semeado pelo tamanho do problema.
   *
   * A mesma leva de pedidos precisa produzir a mesma rota toda vez. Com
   * `Math.random`, replanejar a mesma rota devolveria uma ordem diferente, e o
   * dono ficaria sem saber se o sistema mudou de ideia ou se ele viu errado.
   */
  private geradorDeterministico(semente: number): () => number {
    let estado = semente * 2654435761 + 1;
    return () => {
      estado = (estado * 1664525 + 1013904223) % 4294967296;
      return estado / 4294967296;
    };
  }

  private embaralhar(stopCount: number, sortear: () => number): number[] {
    const xs = Array.from({ length: stopCount }, (_, i) => i + 1);
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(sortear() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  }

  /** Ponto de partida: sempre vá ao ainda-não-visitado mais próximo. */
  private nearestNeighbour(matrix: number[][]): number[] {
    const unvisited = new Set(matrix.map((_, index) => index).slice(1));
    const tour: number[] = [];
    let current = 0;

    while (unvisited.size > 0) {
      let nearest = -1;
      let nearestCost = Infinity;

      for (const candidate of unvisited) {
        if (matrix[current][candidate] < nearestCost) {
          nearestCost = matrix[current][candidate];
          nearest = candidate;
        }
      }

      tour.push(nearest);
      unvisited.delete(nearest);
      current = nearest;
    }

    return tour;
  }

  private bestReversal(tour: number[], matrix: number[][], currentCost: number) {
    let best = { tour, cost: currentCost };

    for (let i = 0; i < tour.length - 1; i++) {
      for (let j = i + 1; j < tour.length; j++) {
        const candidate = [
          ...tour.slice(0, i),
          ...tour.slice(i, j + 1).reverse(),
          ...tour.slice(j + 1),
        ];
        const candidateCost = this.cost(candidate, matrix);
        if (candidateCost < best.cost) best = { tour: candidate, cost: candidateCost };
      }
    }

    return best;
  }

  private bestRelocation(tour: number[], matrix: number[][], currentCost: number) {
    let best = { tour, cost: currentCost };

    for (let from = 0; from < tour.length; from++) {
      const without = [...tour.slice(0, from), ...tour.slice(from + 1)];

      for (let to = 0; to <= without.length; to++) {
        if (to === from) continue;
        const candidate = [...without.slice(0, to), tour[from], ...without.slice(to)];
        const candidateCost = this.cost(candidate, matrix);
        if (candidateCost < best.cost) best = { tour: candidate, cost: candidateCost };
      }
    }

    return best;
  }

  /** Custo total: origem → paradas na ordem → (origem). */
  private cost(tour: number[], matrix: number[][]): number {
    if (tour.length === 0) return 0;

    let total = matrix[0][tour[0]];
    for (let i = 0; i < tour.length - 1; i++) total += matrix[tour[i]][tour[i + 1]];
    if (this.returnToOrigin) total += matrix[tour[tour.length - 1]][0];

    return total;
  }

  private assertSquare(matrix: number[][]): void {
    const square =
      Array.isArray(matrix) &&
      matrix.length > 0 &&
      matrix.every((row) => Array.isArray(row) && row.length === matrix.length);

    if (!square) throw new ValidationError('Matriz de durações inválida');

    const finite = matrix.every((row) => row.every((value) => Number.isFinite(value) && value >= 0));
    if (!finite) {
      // Acontece quando o OSRM não acha caminho até um endereço (ilha, pino no
      // meio de um parque). Falhar aqui é melhor que devolver uma rota com
      // Infinity embutido e o motoboy descobrindo na rua.
      throw new ValidationError(
        'Roteirizador não encontrou caminho até um dos endereços. Confira os pinos no mapa.',
      );
    }
  }
}
