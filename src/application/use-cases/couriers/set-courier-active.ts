import { Courier, NotFoundError, type UnitOfWork } from '@/core';

/**
 * Tira ou devolve o entregador à escala.
 *
 * Não existe excluir: o histórico de entregas dele continua valendo, e apagar
 * o cadastro deixaria rotas antigas sem dono. Quem saiu fica inativo, some da
 * lista de escolha e continua no histórico.
 */
export class SetCourierActive {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(id: string, active: boolean): Promise<void> {
    await this.uow.run(async (repos) => {
      const atual = await repos.couriers.findById(id);
      if (!atual) throw new NotFoundError('Motoboy', id);

      await repos.couriers.save(
        new Courier(atual.id, atual.establishmentId, atual.name, atual.phone, active),
      );
    });
  }
}
