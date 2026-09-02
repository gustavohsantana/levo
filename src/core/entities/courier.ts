import { Entity } from './entity';
import type { PhoneNumber } from '../value-objects';

export class Courier extends Entity {
  constructor(
    id: string,
    readonly establishmentId: string,
    readonly name: string,
    readonly phone: PhoneNumber,
    readonly active: boolean,
    /**
     * A conversa dele com o bot do Telegram, quando ele autorizou.
     *
     * Presente aqui, e não só no banco, porque quem decide por onde avisar é a
     * regra de negócio: ter esta conversa É o consentimento, e consentimento é
     * o que separa um aviso de um spam.
     */
    readonly telegramChatId: string | null = null,
    /** Quanto o sistema acompanha este motoboy. Acordo pessoal, como o pagamento. */
    readonly tracking: 'CHECKIN' | 'CONTINUOUS' = 'CHECKIN',
    /** Quando ele recusou a permissão no aparelho. Diz o porquê da ausência. */
    readonly trackingDeniedAt: Date | null = null,
  ) {
    super(id);
  }
}
