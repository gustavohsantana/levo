import { Entity } from './entity';
import { Money } from '../value-objects';
import type { Address, Coordinates } from '../value-objects';

/** O tenant. Também é o ponto de partida e chegada de toda rota. */
export class Establishment extends Entity {
  constructor(
    id: string,
    readonly name: string,
    readonly address: Address,
    readonly coordinates: Coordinates,
    /**
     * Cidade e estado da operação.
     *
     * Entram em toda busca de endereço: sem eles o geocodificador procura no
     * país inteiro. Opcionais porque o cadastro antigo não os tinha — e um
     * campo obrigatório retroativo quebraria quem já está usando.
     */
    readonly city: string | null = null,
    readonly state: string | null = null,
    /** Taxa de entrega sugerida ao lançar pedido manual. */
    readonly deliveryFee: Money = Money.zero(),
    /** Endereço público do cardápio. `null` enquanto o dono não publicou. */
    readonly slug: string | null = null,
  ) {
    super(id);
  }
}
