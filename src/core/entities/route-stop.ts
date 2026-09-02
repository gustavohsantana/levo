import { Entity } from './entity';
import { StopAlreadyResolvedError } from '../errors';

export const StopStatus = {
  Pending: 'PENDING',
  Delivered: 'DELIVERED',
  Failed: 'FAILED',
} as const;
export type StopStatus = (typeof StopStatus)[keyof typeof StopStatus];

interface StopProps {
  id: string;
  orderId: string;
  position: number;
  status: StopStatus;
  /** Segundos desde a partida até chegar nesta parada, segundo o roteirizador. */
  etaSeconds: number;
  legDistanceMeters: number;
  resolvedAt: Date | null;
  failureReason: string | null;
}

export class RouteStop extends Entity {
  private props: StopProps;

  private constructor(props: StopProps) {
    super(props.id);
    this.props = props;
  }

  static create(input: {
    id: string;
    orderId: string;
    position: number;
    etaSeconds: number;
    legDistanceMeters: number;
  }): RouteStop {
    return new RouteStop({
      ...input,
      status: StopStatus.Pending,
      resolvedAt: null,
      failureReason: null,
    });
  }

  static restore(props: StopProps): RouteStop {
    return new RouteStop(props);
  }

  get orderId() { return this.props.orderId; }
  get position() { return this.props.position; }

  /**
   * Muda de lugar na sequência, com o novo tempo até chegar.
   *
   * Existe só para o replanejamento a partir da posição do motoboy. A parada em
   * si é a mesma — mesmo cliente, mesmo endereço, mesmo pedido; o que mudou foi
   * a ordem em que ele passa por ela.
   */
  resequence(position: number, etaSeconds: number, legDistanceMeters: number): void {
    this.props.position = position;
    this.props.etaSeconds = etaSeconds;
    this.props.legDistanceMeters = legDistanceMeters;
  }
  get status() { return this.props.status; }
  get etaSeconds() { return this.props.etaSeconds; }
  get legDistanceMeters() { return this.props.legDistanceMeters; }
  get resolvedAt() { return this.props.resolvedAt; }
  get failureReason() { return this.props.failureReason; }

  get isPending(): boolean {
    return this.props.status === StopStatus.Pending;
  }

  resolve(status: Exclude<StopStatus, 'PENDING'>, reason: string | null, now: Date): void {
    if (!this.isPending) throw new StopAlreadyResolvedError(this.id);
    this.props.status = status;
    this.props.resolvedAt = now;
    this.props.failureReason = reason;
  }

  /** Previsão de chegada em relógio, para mostrar ao cliente final. */
  estimatedArrival(startedAt: Date): Date {
    return new Date(startedAt.getTime() + this.props.etaSeconds * 1000);
  }
}
