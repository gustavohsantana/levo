import {
  NotFoundError,
  RouteNotActiveError,
  ValidationError,
  type Clock,
  type Coordinates,
  type RouteOptimizer,
  type RoutingService,
  type UnitOfWork,
} from '@/core';

/**
 * Reordena o que falta entregar a partir de onde o motoboy está agora.
 *
 * A rota nasce da loja, e é o certo: é de lá que ele sai. Mas o dia acontece —
 * ele passa em casa buscar o capacete reserva, desvia por causa de bloqueio,
 * ou simplesmente já entregou fora de ordem. A partir daí a sequência planejada
 * na porta do restaurante deixa de fazer sentido, e insistir nela custa
 * quilômetro.
 *
 * Só mexe no que ainda não foi entregue. Parada resolvida é história, e
 * história não se replaneja.
 */
export class ReplanFromHere {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly routing: RoutingService,
    private readonly optimizer: RouteOptimizer,
    private readonly clock: Clock,
  ) {}

  async execute(routeId: string, from: Coordinates): Promise<{ reordenadas: number }> {
    const contexto = await this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);
      if (route.status !== 'IN_PROGRESS') {
        throw new RouteNotActiveError(route.id, route.status);
      }

      const pendentes = route.stops.filter((stop) => stop.status === 'PENDING');
      if (pendentes.length < 2) {
        /*
         * Com uma parada só não há o que reordenar, e dizer isso é melhor do
         * que devolver "pronto!" para um botão que não fez nada.
         */
        throw new ValidationError('Só faz sentido com duas ou mais entregas pendentes.');
      }

      const orders = await repos.orders.findManyByIds(pendentes.map((s) => s.orderId));
      const establishment = await repos.establishments.current();

      return { pendentes, orders, origem: establishment.coordinates };
    });

    const porPedido = new Map(contexto.orders.map((o) => [o.id, o]));
    const paradas = contexto.pendentes
      .map((stop) => ({ stop, coordinates: porPedido.get(stop.orderId)?.coordinates }))
      .filter((x): x is { stop: (typeof contexto.pendentes)[number]; coordinates: Coordinates } =>
        Boolean(x.coordinates),
      );

    if (paradas.length < 2) {
      throw new ValidationError('As entregas pendentes não têm ponto no mapa.');
    }

    /*
     * Três grupos de pontos: onde ele está, as entregas, e a loja.
     *
     * O problema não é o mesmo do planejamento original. Lá, sai da loja e volta
     * para a loja — um ciclo. Aqui ele sai de um lugar qualquer e termina na
     * loja: começo e fim fixos, mas diferentes.
     */
    const pontos: Coordinates[] = [from, ...paradas.map((p) => p.coordinates), contexto.origem];
    const completa = await this.routing.durationMatrix(pontos);
    const iLoja = pontos.length - 1;

    /*
     * Reduz o caminho de começo e fim fixos a um ciclo, que é o que o otimizador
     * resolve.
     *
     * A linha 0 continua sendo "daqui até cada entrega". A COLUNA 0 passa a ser
     * "de cada entrega até a loja" — em vez de voltar ao ponto de partida. Com
     * isso, o custo do ciclo que o otimizador calcula é exatamente o custo do
     * trajeto que queremos: daqui, pelas entregas, até a loja.
     *
     * É a redução clássica, e não um truque: sem ela, o otimizador escolheria a
     * ordem que faz ele voltar para onde estava — que é justamente o lugar para
     * onde ele não vai.
     */
    const matriz = completa.slice(0, iLoja).map((linha) => linha.slice(0, iLoja));
    for (let i = 1; i < matriz.length; i++) matriz[i][0] = completa[i][iLoja];

    const otimizada = this.optimizer.optimize(matriz);
    const novaOrdem = otimizada.order.map((indice) => paradas[indice - 1].stop);

    const path = await this.routing.path([
      from,
      ...otimizada.order.map((indice) => paradas[indice - 1].coordinates),
      contexto.origem,
    ]);

    return this.uow.run(async (repos) => {
      const route = await repos.routes.findById(routeId);
      if (!route) throw new NotFoundError('Rota', routeId);

      route.resequence(
        novaOrdem.map((stop) => stop.id),
        {
          geometry: path.geometry,
          distanceMeters: path.distanceMeters,
          durationSeconds: Math.round(otimizada.totalDurationSeconds),
          legs: path.legs,
        },
        this.clock.now(),
      );

      await repos.routes.save(route);
      await repos.events.append(route.pullEvents());

      return { reordenadas: novaOrdem.length };
    });
  }
}
