import { StatusPill } from '../primitives';
import { clockTime, currency } from '../format';
import type { OrderView } from '@/presentation/queries';
import { OrderDetailDialog } from './order-detail-dialog';

/**
 * O que já saiu da fila hoje: entregue, não entregue, cancelado.
 *
 * Existia um buraco no painel — pedido resolvido simplesmente sumia da tela. O
 * dono não tinha onde conferir o que aconteceu no turno, e um pedido cancelado
 * na plataforma era indistinguível de um pedido que nunca existiu.
 *
 * Fica embaixo e recolhido por padrão: é consulta, não fila de trabalho. Quem
 * abre o painel no sábado à noite precisa ver o que falta fazer, não o
 * histórico.
 *
 * A linha inteira abre o mesmo detalhe do quadro. Cliente liga dizendo que o
 * pedido veio errado: o dono clica no nome e vê o que saiu, sem procurar o
 * ticket no marketplace.
 */
const FINALIZADOS = new Set(['DELIVERED', 'FAILED', 'CANCELLED']);

export function FinishedOrders({ orders }: { orders: OrderView[] }) {
  const finished = orders
    .filter((order) => FINALIZADOS.has(order.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (finished.length === 0) return null;

  const entregues = finished.filter((o) => o.status === 'DELIVERED').length;
  /*
   * Cancelado ganha contagem própria no cabeçalho, ao lado de entregue.
   * Somados num total só, três cancelamentos numa tarde passavam despercebidos
   * — e é justamente o número que o dono precisa ver sem abrir nada.
   */
  const cancelados = finished.filter((o) => o.status === 'CANCELLED').length;

  return (
    <section>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 py-2">
          <h2 className="text-sm font-semibold text-ink">Finalizados hoje</h2>
          <span className="numeric rounded-xs bg-raised px-1.5 py-0.5 text-xs text-ink-muted">
            {finished.length}
          </span>
          {entregues > 0 ? (
            <span className="text-xs text-ink-faint">
              <span className="numeric">{entregues}</span> entregue
              {entregues > 1 ? 's' : ''}
            </span>
          ) : null}
          {cancelados > 0 ? (
            <span className="text-xs text-danger">
              <span className="numeric">{cancelados}</span> cancelado
              {cancelados > 1 ? 's' : ''}
            </span>
          ) : null}
          <span className="ml-auto text-xs text-ink-faint group-open:hidden">mostrar</span>
          <span className="ml-auto hidden text-xs text-ink-faint group-open:inline">ocultar</span>
        </summary>

        <ul className="mt-1 overflow-hidden rounded-lg bg-surface hairline">
          {finished.map((order) => (
            <li key={order.id} className="border-b last:border-b-0">
              <OrderDetailDialog
                pedido={order}
                trigger={
                  <button
                    type="button"
                    aria-label={`Ver o pedido de ${order.customerName}`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{order.customerName}</p>
                      <p className="truncate text-xs text-ink-muted">{order.address}</p>
                    </div>

                    <StatusPill status={order.status} />

                    <span className="numeric hidden text-sm text-ink-muted sm:inline">
                      {currency(order.amountCents)}
                    </span>
                    <span className="numeric text-xs text-ink-faint">
                      {clockTime(order.createdAt)}
                    </span>
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
