import type {
  CancellationReason,
  Clock,
  Logger,
  MarketplaceCommands,
  OrderSourceKind,
  UnitOfWork,
} from '@/core';
import { DomainError } from '@/core';

/** Falha que o lojista precisa ler na tela, não no log. */
export class CancellationRefusedError extends DomainError {
  readonly code = 'CANCELLATION_REFUSED';
  /* 409: o pedido existe, mas o estado dele (aqui ou lá) não permite. */
  readonly httpStatus = 409;
  constructor(motivo: string) {
    super(motivo);
  }
}

/**
 * Resolve o canal de comandos da plataforma daquele pedido.
 *
 * Recebe a origem porque um estabelecimento pode ter iFood e aiqfome ao mesmo
 * tempo, e o pedido sabe de qual dos dois veio.
 */
export type CommandsResolver = (kind: OrderSourceKind) => Promise<MarketplaceCommands | null>;

/**
 * Cancela um pedido na plataforma de origem, a pedido do lojista.
 *
 * Síncrono de propósito, ao contrário de confirmar/pronto/despachar, que vão
 * pela caixa de saída. Dois motivos: o motivo do cancelamento é escolhido para
 * aquele pedido específico, e uma recusa precisa aparecer na cara de quem
 * clicou — um cancelamento que enfileira e falha meio minuto depois deixa o
 * lojista achando que resolveu.
 *
 * O estado local só muda depois que a plataforma aceita. Marcar antes deixaria
 * o painel dizendo "cancelado" para um pedido que o iFood recusou — e a comida
 * sairia assim mesmo.
 */
export class CancelOrder {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly commandsFor: CommandsResolver,
    private readonly clock: Clock,
    private readonly logger?: Logger,
  ) {}

  /**
   * Motivos aceitos para aquele pedido, perguntados à plataforma.
   *
   * Nunca decorados: a lista depende do estado do pedido, e um código inventado
   * é recusado. Lista vazia é resposta legítima — o ambiente de testes do iFood
   * devolve 204 — e nesse caso o lojista ainda pode cancelar, com o motivo
   * padrão da plataforma.
   */
  async reasons(orderId: string): Promise<CancellationReason[]> {
    const { commands } = await this.resolve(orderId);
    if (!commands?.cancellationReasons) return [];
    return commands.cancellationReasons(await this.externalIdOf(orderId));
  }

  async execute(orderId: string, reason: string, code: string): Promise<void> {
    const { commands, externalId } = await this.resolve(orderId);

    if (!commands?.requestCancellation) {
      throw new CancellationRefusedError(
        'Esta plataforma não aceita cancelamento pela integração. Cancele pelo painel dela.',
      );
    }

    try {
      await commands.requestCancellation(externalId, reason, code);
    } catch (cause) {
      this.logger?.error({ orderId, code, cause: String(cause) }, 'pedido.cancelamento_recusado');
      throw new CancellationRefusedError(
        'A plataforma recusou o cancelamento. Tente outro motivo ou cancele por lá.',
      );
    }

    /*
     * A plataforma aceitou, então o pedido está cancelado — não esperamos o
     * evento voltar pelo polling. Ele chega depois e é inofensivo: a entidade
     * ignora cancelamento repetido.
     */
    await this.uow.run(async (repos) => {
      const order = await repos.orders.findById(orderId);
      if (!order) return;
      order.markCancelledExternally(this.clock.now());
      await repos.orders.save(order);
      await repos.events.append(order.pullEvents());
    });

    this.logger?.info({ orderId, code }, 'pedido.cancelado');
  }

  private async resolve(
    orderId: string,
  ): Promise<{ commands: MarketplaceCommands | null; externalId: string }> {
    const order = await this.uow.run((repos) => repos.orders.findById(orderId));
    if (!order) throw new CancellationRefusedError('Pedido não encontrado.');
    if (!order.externalId) {
      throw new CancellationRefusedError(
        'Este pedido não veio de um marketplace — não há o que cancelar lá fora.',
      );
    }

    return { commands: await this.commandsFor(order.source), externalId: order.externalId };
  }

  private async externalIdOf(orderId: string): Promise<string> {
    const order = await this.uow.run((repos) => repos.orders.findById(orderId));
    return order?.externalId ?? '';
  }
}
