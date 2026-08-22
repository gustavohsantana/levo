import type { DomainEvent } from '../events/domain-event';

export abstract class Entity {
  protected constructor(readonly id: string) {}

  equals(other: Entity | null | undefined): boolean {
    return !!other && other.constructor === this.constructor && other.id === this.id;
  }
}

/**
 * Raiz de agregado: além de identidade, acumula os eventos que aconteceram
 * durante a transação. A UnitOfWork drena com `pullEvents()` e grava tudo junto
 * — nunca fora do commit, senão o log mente sobre o que de fato foi persistido.
 */
export abstract class AggregateRoot extends Entity {
  private events: DomainEvent[] = [];

  protected record(
    name: string,
    establishmentId: string,
    payload: Record<string, unknown> = {},
    at: Date = new Date(),
  ): void {
    this.events.push({
      name,
      occurredAt: at,
      establishmentId,
      aggregateId: this.id,
      payload,
    });
  }

  pullEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
