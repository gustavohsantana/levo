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
    /**
     * Aceita sozinho o pedido que chega do marketplace.
     *
     * O iFood dá 3 minutos para confirmar e penaliza quem passa disso — prazo
     * que ninguém cumpre olhando a tela numa cozinha cheia.
     */
    readonly autoConfirmOrders: boolean = false,
    /**
     * Manda a rota para o motoboy no WhatsApp assim que ela é planejada.
     *
     * Desligado por padrão de propósito: mensagem automática sai de um número
     * que pode ser banido, e ligar isso é decisão do dono — não um padrão que
     * ele descobre quando o motoboy reclama.
     */
    readonly whatsappRoutes: boolean = false,
    /**
     * Exige o código do cliente para o entregador fechar a entrega.
     *
     * Desligado por padrão: ligar muda o trabalho do motoboy no meio do turno.
     */
    readonly requireDeliveryCode: boolean = false,
    /** Oferece retirada no balcão no cardápio público. */
    readonly pickupEnabled: boolean = false,
  ) {
    super(id);
  }
}
