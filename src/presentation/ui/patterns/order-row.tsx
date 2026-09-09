'use client';

import { useTransition } from 'react';
import { Flame, MessageCircle } from 'lucide-react';
import { marcarUrgenteAction } from '@/presentation/actions';
import type { OrderView } from '@/presentation/queries';
import { cn } from '../cn';
import { clockTime, currency, phoneDisplay } from '../format';

/**
 * Uma linha da fila.
 *
 * Densa de propósito: o dono precisa ver oito pedidos sem rolar. Cada linha
 * responde de relance "quem, onde, quanto, quando" — e nada além disso, porque
 * o detalhe cabe no clique.
 */
export function OrderRow({
  order,
  selected,
  onToggle,
}: {
  order: OrderView;
  selected: boolean;
  onToggle: (id: string, shiftKey: boolean) => void;
}) {
  const [marcando, marcar] = useTransition();

  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0 transition-colors',
        selected ? 'bg-accent-soft/60' : 'hover:bg-raised',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) =>
          onToggle(order.id, (event.nativeEvent as MouseEvent).shiftKey ?? false)
        }
        onClick={(event) => {
          if (event.shiftKey) {
            event.preventDefault();
            onToggle(order.id, true);
          }
        }}
        className="size-4 shrink-0 accent-[var(--accent)]"
        aria-label={`Selecionar pedido de ${order.customerName}`}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
          {order.urgente ? (
            <Flame className="size-3.5 shrink-0 text-danger" aria-label="Urgente" />
          ) : null}
          {order.customerName}
          {order.pickup ? (
            <span className="shrink-0 rounded-sm bg-moving-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-moving">
              Retirada
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {/* Retirada não tem endereço de entrega — o cliente busca no balcão. */}
          {order.pickup ? 'Retira no balcão' : order.address}
          {!order.pickup && order.reference ? (
            <span className="text-ink-faint"> · {order.reference}</span>
          ) : null}
        </p>
      </div>

      {order.notes ? (
        <p className="hidden max-w-40 truncate text-xs text-ink-faint lg:block" title={order.notes}>
          {order.notes}
        </p>
      ) : null}

      <span className="numeric hidden w-20 text-right text-xs text-ink-muted sm:block">
        {currency(order.amountCents)}
      </span>

      <span className="numeric w-11 text-right text-xs text-ink-faint">
        {clockTime(order.createdAt)}
      </span>

      {/*
        A marcação de urgente fica junto do horário, e não escondida no detalhe.
        O gatilho dela é o telefone tocando — o dono precisa marcar sem sair da
        fila e sem procurar onde.
      */}
      <button
        type="button"
        disabled={marcando}
        onClick={(e) => {
          // Sem isto o clique também seleciona a linha, e o dono acha que marcou
          // errado.
          e.stopPropagation();
          marcar(async () => {
            await marcarUrgenteAction(order.id, !order.urgente);
          });
        }}
        title={
          order.urgente
            ? 'Tirar a marca de urgente'
            : 'Marcar como urgente — o cliente já ligou cobrando'
        }
        className={cn(
          'shrink-0 rounded-md p-1 transition disabled:opacity-40',
          order.urgente
            ? 'text-danger hover:bg-danger-soft'
            : 'text-ink-faint/40 hover:bg-raised hover:text-ink-muted',
        )}
      >
        <Flame className="size-3.5" aria-hidden />
      </button>

      {/*
        O link do WhatsApp já fica aqui, com a mensagem escrita.
        Um toque a mais que o envio automático — e nenhum custo de API, nenhum
        template para aprovar. Some quando o pedido não tem telefone válido.
      */}
      {order.whatsappLink ? (
        <a
          href={order.whatsappLink}
          target="_blank"
          rel="noreferrer"
          title={`Avisar ${order.customerName} no WhatsApp${
            order.customerPhone ? ` · ${phoneDisplay(order.customerPhone)}` : ''
          }`}
          className="grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-raised hover:text-ink"
        >
          <MessageCircle className="size-4" aria-hidden />
          <span className="sr-only">Avisar no WhatsApp</span>
        </a>
      ) : (
        <span className="size-8 shrink-0" aria-hidden />
      )}
    </div>
  );
}
