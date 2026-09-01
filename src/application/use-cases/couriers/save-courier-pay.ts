import { Money, NotFoundError, type UnitOfWork } from '@/core';
import type { CourierPayModel } from '@/core/services/courier-pay';

/**
 * Grava o acordo de pagamento de um motoboy.
 *
 * As faixas chegam desordenadas e com linha em branco — é um formulário onde o
 * dono digita e apaga. Ordenar e limpar aqui deixa o resto do sistema livre da
 * suposição de que alguém preencheu direito.
 */
export class SaveCourierPay {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly establishmentId: string,
  ) {}

  async execute(input: {
    courierId: string;
    model: CourierPayModel;
    perDeliveryCents: number;
    dailyCents: number;
    bands: Array<{ uptoMeters: number; amountCents: number }>;
  }): Promise<void> {
    await this.uow.run(async (repos) => {
      const courier = await repos.couriers.findById(input.courierId);
      if (!courier || courier.establishmentId !== this.establishmentId) {
        throw new NotFoundError('Entregador', input.courierId);
      }

      await repos.couriers.savePayAgreement(input.courierId, {
        model: input.model,
        perDelivery: Money.fromCents(Math.max(0, Math.round(input.perDeliveryCents))),
        daily: Money.fromCents(Math.max(0, Math.round(input.dailyCents))),
        bands: input.bands
          .filter((b) => b.uptoMeters > 0)
          .sort((a, b) => a.uptoMeters - b.uptoMeters)
          .map((b) => ({
            uptoMeters: Math.round(b.uptoMeters),
            amount: Money.fromCents(Math.max(0, Math.round(b.amountCents))),
          })),
      });
    });
  }
}
