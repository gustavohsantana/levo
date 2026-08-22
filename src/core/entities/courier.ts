import { Entity } from './entity';
import type { PhoneNumber } from '../value-objects';

export class Courier extends Entity {
  constructor(
    id: string,
    readonly establishmentId: string,
    readonly name: string,
    readonly phone: PhoneNumber,
    readonly active: boolean,
  ) {
    super(id);
  }
}
