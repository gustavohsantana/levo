import {
  Courier,
  NotFoundError,
  PhoneNumber,
  type IdGenerator,
  type UnitOfWork,
} from '@/core';

interface Input {
  /** Ausente cadastra; presente edita. */
  id?: string | null;
  name: string;
  phone: string;
  active?: boolean;
  /** Quantos pedidos ele leva por viagem. Ausente preserva o que já estava. */
  maxStops?: number;
}

/**
 * Cadastra ou edita um entregador.
 *
 * O cadastro é curto de propósito — nome e telefone. O telefone não é detalhe
 * de contato: é por onde a rota chega, num link de WhatsApp. Sem ele o
 * entregador existe no sistema e não recebe trabalho.
 */
export class SaveCourier {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly establishmentId: string,
  ) {}

  async execute(input: Input): Promise<Courier> {
    return this.uow.run(async (repos) => {
      const phone = PhoneNumber.create(input.phone);
      const name = input.name.trim();

      let atual: Courier | null = null;
      if (input.id) {
        atual = await repos.couriers.findById(input.id);
        if (!atual) throw new NotFoundError('Motoboy', input.id);
      }

      /*
       * A capacidade sobrevive à edição do nome.
       *
       * O construtor tem valor padrão, então montar o motoboy sem ela devolveria
       * 15 para todo mundo — e trocar o telefone de alguém apagaria em silêncio a
       * capacidade que o dono tinha configurado.
       */
      const courier = new Courier(
        input.id || this.ids.next(),
        this.establishmentId,
        name,
        phone,
        input.active ?? true,
        atual?.telegramChatId ?? null,
        atual?.tracking ?? 'CHECKIN',
        atual?.trackingDeniedAt ?? null,
        input.maxStops ?? atual?.maxStops ?? 15,
      );

      await repos.couriers.save(courier);
      return courier;
    });
  }
}
