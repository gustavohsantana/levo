import {
  Address,
  type Clock,
  type Geocoder,
  type IdGenerator,
  Money,
  Order,
  type ExternalOrder,
  type OrderSource,
  PhoneNumber,
  type UnitOfWork,
  type Logger,
} from '@/core';

export interface ImportResult {
  imported: number;
  duplicates: number;
  failed: number;
}

/**
 * Traz pedidos de uma plataforma externa para dentro do Levô.
 *
 * Não sabe se está falando com iFood, aiqfome ou webhook — recebe um
 * `OrderSource` e pronto. Ligar uma plataforma nova é registrar outro adapter
 * no composition root; este arquivo não muda.
 */
export class ImportOrderFromSource {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly geocoder: Geocoder,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly establishmentId: string,
    private readonly logger?: Logger,
  ) {}

  async execute(source: OrderSource): Promise<ImportResult> {
    const pending = await source.fetchPending();
    const result: ImportResult = { imported: 0, duplicates: 0, failed: 0 };
    const acknowledged: string[] = [];

    for (const external of pending) {
      try {
        const outcome = await this.importOne(source, external);
        if (outcome === 'duplicate') result.duplicates++;
        else result.imported++;
        acknowledged.push(external.externalId);
      } catch (cause) {
        // Um pedido com endereço impossível não pode derrubar a leva inteira.
        // Ele fica sem ack e volta no próximo ciclo de polling.
        result.failed++;
        this.logger?.error(
          { externalId: external.externalId, source: source.kind, cause: String(cause) },
          'import.failed',
        );
      }
    }

    /*
     * Sempre, mesmo sem nada importado.
     *
     * A leva pode ter vindo só com evento que não vira pedido — cancelamento,
     * mudança de status — e esses também precisam sair da fila da plataforma.
     * Com a condição `length > 0` que havia aqui, um lote sem pedido novo
     * deixava tudo sem reconhecimento, e o mesmo lixo voltava a cada 30
     * segundos até expirar 8 horas depois. Cada adapter decide o que enviar.
     */
    await source.acknowledge(acknowledged);

    return result;
  }

  private async importOne(
    source: OrderSource,
    external: ExternalOrder,
  ): Promise<'imported' | 'duplicate'> {
    /**
     * ⭐ Idempotência.
     *
     * O polling do iFood reentrega evento por projeto — a documentação assume
     * isso. Sem esta checagem, o mesmo pedido entra duas vezes e o motoboy sai
     * com uma entrega fantasma no baú. Por isso "já existe" é sucesso
     * silencioso, nunca erro: reprocessar a mesma leva tem que ser inofensivo.
     *
     * O `unique (establishmentId, source, externalId)` no banco é a segunda
     * linha de defesa, para o caso de duas leituras concorrentes.
     */
    const existing = await this.uow.run((repos) =>
      repos.orders.findBySourceRef(source.kind, external.externalId),
    );
    if (existing) return 'duplicate';

    const address = Address.create(external.address, external.reference);
    const coordinates = await this.geocoder.geocode(address).catch(() => null);

    return this.uow.run(async (repos) => {
      // Recheca dentro da transação: entre a leitura acima e agora, outro ciclo
      // de polling pode ter importado o mesmo pedido.
      const raced = await repos.orders.findBySourceRef(source.kind, external.externalId);
      if (raced) return 'duplicate';

      const order = Order.create({
        id: this.ids.next(),
        establishmentId: this.establishmentId,
        source: source.kind,
        externalId: external.externalId,
        customerName: external.customerName,
        customerPhone: external.customerPhone
          ? PhoneNumber.tryCreate(external.customerPhone)
          : null,
        address,
        coordinates,
        amount: Money.fromCents(external.amountCents),
        notes: external.notes,
        now: external.placedAt ?? this.clock.now(),
      });

      if (!coordinates) order.markGeocodingFailed('endereço não localizado', this.clock.now());

      await repos.orders.save(order);
      await repos.events.append(order.pullEvents());

      return 'imported';
    });
  }
}
