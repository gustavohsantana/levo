import type { Repositories, UnitOfWork } from '@/core';
import type { LevoPrismaClient } from './client';
import { buildRepositories } from './repositories';

/**
 * Uma transação por caso de uso.
 *
 * Planejar uma rota grava a rota, N paradas e atualiza N pedidos. Ou tudo, ou
 * nada: um pedido marcado "em rota" apontando para uma rota que não existe é um
 * pedido que some da tela do dono e nunca chega no cliente — e ninguém descobre
 * até o telefone tocar.
 */
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: LevoPrismaClient,
    private readonly establishmentId: string,
    private readonly timeoutMs = 15_000,
  ) {}

  async run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      (tx) => work(buildRepositories(tx as never, this.establishmentId)),
      { timeout: this.timeoutMs },
    );
  }

  /**
   * Leitura de tela, sem transação.
   *
   * Uma tela não tem o que garantir entre consultas: se o pedido 300 chegar
   * entre a busca dos pendentes e a das rotas, a única consequência é ele
   * aparecer no próximo render — que acontece segundos depois.
   *
   * O que a transação cobrava por essa garantia inútil era caro: dentro dela as
   * consultas precisam ser SEQUENCIAIS (disparar em paralelo sobre o mesmo
   * cliente de transação é desaconselhado pela própria documentação do Prisma),
   * então o painel pagava sete idas ao banco em fila indiana — cerca de 120 ms
   * cada, com o dono esperando.
   *
   * Fora dela, as mesmas sete rodam de uma vez.
   */
  async readOnly<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return work(buildRepositories(this.prisma as never, this.establishmentId));
  }
}
