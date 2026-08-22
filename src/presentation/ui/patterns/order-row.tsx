'use client';

import { MessageCircle } from 'lucide-react';
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
        <p className="truncate text-sm font-medium text-ink">{order.customerName}</p>
        <p className="truncate text-xs text-ink-muted">
          {order.address}
          {order.reference ? <span className="text-ink-faint"> · {order.reference}</span> : null}
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
