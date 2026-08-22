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
}
