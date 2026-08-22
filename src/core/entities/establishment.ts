import { Entity } from './entity';
import type { Address, Coordinates } from '../value-objects';

/** O tenant. Também é o ponto de partida e chegada de toda rota. */
export class Establishment extends Entity {
  constructor(
    id: string,
    readonly name: string,
    readonly address: Address,
    readonly coordinates: Coordinates,
  ) {
    super(id);
  }
}
