import { AggregateRoot } from './entity';
import { RouteStop, StopStatus } from './route-stop';
import { RouteEvents } from '../events/domain-event';
import {
  EmptyRouteError,
  NotFoundError,
  RouteAlreadyStartedError,
  RouteNotActiveError,
} from '../errors';
import { Token } from '../value-objects';

export const RouteStatus = {
  Planned: 'PLANNED',
  InProgress: 'IN_PROGRESS',
  Finished: 'FINISHED',
} as const;
export type RouteStatus = (typeof RouteStatus)[keyof typeof RouteStatus];

interface RouteProps {
  id: string;
  establishmentId: string;
  courierId: string;
  status: RouteStatus;
  accessToken: Token;
  stops: RouteStop[];
  /** Polyline codificada devolvida pelo roteirizador, para desenhar no mapa. */
  geometry: string | null;
  distanceMeters: number;
  durationSeconds: number;
  /**
   * Duração da rota na ordem em que os pedidos chegaram — o que aconteceria
   * sem o Girô. É o "antes" da comparação.
   */
  baselineDurationSeconds: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export class Route extends AggregateRoot {
  private props: RouteProps;

  private constructor(props: RouteProps) {
    super(props.id);
    this.props = props;
  }

  static plan(input: {
    id: string;
    establishmentId: string;
    courierId: string;
    stops: RouteStop[];
    geometry: string | null;
    distanceMeters: number;
    durationSeconds: number;
    baselineDurationSeconds: number;
    now?: Date;
  }): Route {
    if (input.stops.length === 0) throw new EmptyRouteError();
    const now = input.now ?? new Date();

    const route = new Route({
      id: input.id,
      establishmentId: input.establishmentId,
      courierId: input.courierId,
      status: RouteStatus.Planned,
      accessToken: Token.generate(),
      stops: [...input.stops].sort((a, b) => a.position - b.position),
      geometry: input.geometry,
      distanceMeters: input.distanceMeters,
      durationSeconds: input.durationSeconds,
      baselineDurationSeconds: input.baselineDurationSeconds,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
    });

    route.record(RouteEvents.Planned, input.establishmentId, {
      courierId: input.courierId,
      stops: input.stops.length,
      distanceMeters: input.distanceMeters,
      durationSeconds: input.durationSeconds,
      baselineDurationSeconds: input.baselineDurationSeconds,
      savedSeconds: route.savedSeconds,
    }, now);

    return route;
  }

  static restore(props: RouteProps): Route {
    return new Route(props);
  }

  get establishmentId() { return this.props.establishmentId; }
  get courierId() { return this.props.courierId; }
  get status() { return this.props.status; }
  get accessToken() { return this.props.accessToken; }
  get stops(): readonly RouteStop[] { return this.props.stops; }
  get geometry() { return this.props.geometry; }
  get distanceMeters() { return this.props.distanceMeters; }
  get durationSeconds() { return this.props.durationSeconds; }
  get baselineDurationSeconds() { return this.props.baselineDurationSeconds; }
  get createdAt() { return this.props.createdAt; }
  get startedAt() { return this.props.startedAt; }
  get finishedAt() { return this.props.finishedAt; }

  /**
   * ⭐ A métrica que vende o produto: quantos segundos a otimização economizou
   * em relação a sair na ordem em que os pedidos chegaram.
   *
   * Nunca negativa — se o 2-opt não achou nada melhor que a ordem original,
   * a economia é zero, não um número vermelho. Prometer menos e entregar mais.
   */
  get savedSeconds(): number {
    return Math.max(0, this.props.baselineDurationSeconds - this.props.durationSeconds);
  }

  get savedMinutes(): number {
    return Math.round(this.savedSeconds / 60);
  }

  get pendingStops(): RouteStop[] {
    return this.props.stops.filter((stop) => stop.isPending);
  }

  get nextStop(): RouteStop | null {
    return this.pendingStops[0] ?? null;
  }

  get isFinished(): boolean {
    return this.props.status === RouteStatus.Finished;
  }

  start(now = new Date()): void {
    if (this.props.status !== RouteStatus.Planned) throw new RouteAlreadyStartedError(this.id);
    this.props.status = RouteStatus.InProgress;
    this.props.startedAt = now;
    this.record(RouteEvents.Started, this.props.establishmentId, {
      stops: this.props.stops.length,
    }, now);
  }

  /**
   * Conclui uma parada.
   *
   * Deliberadamente **não** exige ordem: o motoboy desvia por rua interditada,
   * o cliente não atende e ele volta depois. Software que trava porque a
   * realidade não seguiu o plano é software que o motoboy abandona. A ordem
   * planejada é sugestão; o que aconteceu de fato fica registrado.
   */
  completeStop(
    stopId: string,
    outcome: Exclude<StopStatus, 'PENDING'>,
    reason: string | null,
    now = new Date(),
  ): RouteStop {
    if (this.props.status !== RouteStatus.InProgress) {
      throw new RouteNotActiveError(this.id, this.props.status);
    }

    const stop = this.props.stops.find((candidate) => candidate.id === stopId);
    if (!stop) throw new NotFoundError('Parada', stopId);

    stop.resolve(outcome, reason, now);

    const plannedEta = stop.estimatedArrival(this.props.startedAt ?? this.props.createdAt);
    this.record(RouteEvents.StopCompleted, this.props.establishmentId, {
      stopId,
      orderId: stop.orderId,
      outcome,
      position: stop.position,
      /** Atraso em relação ao previsto — alimenta a métrica de ETA do piloto. */
      etaDeviationSeconds: Math.round((now.getTime() - plannedEta.getTime()) / 1000),
    }, now);

    if (this.pendingStops.length === 0) this.finish(now);

    return stop;
  }

  private finish(now: Date): void {
    this.props.status = RouteStatus.Finished;
    this.props.finishedAt = now;

    const delivered = this.props.stops.filter((s) => s.status === StopStatus.Delivered).length;
    this.record(RouteEvents.Finished, this.props.establishmentId, {
      stops: this.props.stops.length,
      delivered,
      failed: this.props.stops.length - delivered,
      savedSeconds: this.savedSeconds,
      actualDurationSeconds: this.props.startedAt
        ? Math.round((now.getTime() - this.props.startedAt.getTime()) / 1000)
        : null,
      plannedDurationSeconds: this.props.durationSeconds,
    }, now);
  }
}
