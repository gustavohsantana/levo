import { Coordinates, NotFoundError, type Clock, type UnitOfWork } from '@/core';

/**
 * Posição do motoboy, ~a cada 15s enquanto a rota corre.
 *
 * É a escrita mais frequente do sistema. Não emite evento de domínio de
 * propósito: seriam centenas de milhares de linhas por dia sem valor
 * analítico. O trajeto vive em tabela própria, com retenção curta.
 */
export class RecordCourierPing {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(
    routeId: string,
    input: { lat: number; lng: number; at?: Date; source?: 'APP' | 'TELEGRAM' },
  ): Promise<void> {
    const coordinates = Coordinates.create(input.lat, input.lng);

    await this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);
      // Rota encerrada não recebe mais posição: o app pode demorar a perceber
      // que acabou e continuar mandando.
      if (route.isFinished) return;

      await repos.pings.record(
        routeId,
        coordinates,
        input.at ?? this.clock.now(),
        input.source ?? 'APP',
      );
    });
  }
}
