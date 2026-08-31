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
  /** Pedidos que mudaram de estado na plataforma (cancelados, concluídos). */
  updated: number;
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
    const result: ImportResult = { imported: 0, duplicates: 0, failed: 0, updated: 0 };
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
    /*
     * O pedido não vive só aqui: ele é cancelado pelo cliente e concluído pelo
     * próprio marketplace, sem passar por nós. Aplicar essas mudanças é o que
     * impede o painel de mostrar como pendente um pedido cancelado — e o
     * motoboy de sair com uma parada que já não existe.
     */
    result.updated = await this.applyStatusChanges(source);

    await source.acknowledge(acknowledged);

    return result;
  }

  private async applyStatusChanges(source: OrderSource): Promise<number> {
    const changes = source.statusChanges?.() ?? [];
    if (changes.length === 0) return 0;

    let applied = 0;

    for (const change of changes) {
      // DISPATCHED não muda nada aqui: quem despacha é o Levô, e o pedido já
      // está em rota quando o evento volta.
      if (change.status === 'DISPATCHED') continue;

      try {
        const aplicado = await this.uow.run(async (repos) => {
          const order = await repos.orders.findBySourceRef(source.kind, change.externalId);
          if (!order) return false;

          if (change.status === 'CANCELLED') order.markCancelledExternally(this.clock.now());
          else order.markConcludedExternally(this.clock.now());

          await repos.orders.save(order);
          /*
           * Sem este append, o pedido mudava de estado sem deixar rastro: o
           * histórico mostrava só `order.created` para um pedido cancelado
           * horas antes, e não havia como saber se quem cancelou foi o cliente,
           * a plataforma ou nós. Toda outra transição do sistema grava evento;
           * esta era a única que não gravava.
           */
          await repos.events.append(order.pullEvents());
          return true;
        });

        if (aplicado) applied++;
      } catch (cause) {
        // Uma mudança que não aplica não pode derrubar o ciclo: o pedido pode
        // ter sido apagado, ou estar num estado que a entidade recusa.
        this.logger?.error(
          { externalId: change.externalId, status: change.status, cause: String(cause) },
          'import.status_change_failed',
        );
      }
    }

    return applied;
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

      /*
       * Os itens vêm sem `productId`: o que o marketplace vendeu não é
       * necessariamente um produto do nosso catálogo, e inventar o vínculo por
       * semelhança de nome erraria justamente nos combos. O nome e o preço são
       * cópia do momento do pedido, que é o que a cozinha precisa ler.
       */
      const itens = (external.items ?? []).map((item) => ({
        productId: null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Money.fromCents(item.unitPriceCents),
        discount: Money.zero(),
      }));

      const order = Order.create({
        id: this.ids.next(),
        establishmentId: this.establishmentId,
        source: source.kind,
        externalId: external.externalId,
        displayId: external.displayId ?? null,
        customerName: external.customerName,
        customerPhone: external.customerPhone
          ? PhoneNumber.tryCreate(external.customerPhone)
          : null,
        address,
        coordinates,
        /*
         * Com itens, a entidade deriva o total deles mais a taxa e ignora este
         * `amount` — e o adapter manda a taxa justamente como a diferença até
         * o total da plataforma, para a conta fechar no centavo.
         */
        amount: Money.fromCents(external.amountCents),
        deliveryFee:
          external.deliveryFeeCents !== undefined
            ? Money.fromCents(external.deliveryFeeCents)
            : undefined,
        paymentMethod: external.paymentMethod ?? null,
        items: itens,
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
