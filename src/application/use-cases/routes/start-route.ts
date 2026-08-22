import { NotFoundError, type Clock, type Route, type UnitOfWork } from '@/core';

export class StartRoute {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(routeId: string): Promise<Route> {
    return this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);

      route.start(this.clock.now());

      await repos.routes.save(route);
      await repos.events.append(route.pullEvents());

      return route;
    });
  }
}
