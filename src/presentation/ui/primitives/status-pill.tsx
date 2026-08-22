import { Check, CircleDashed, Navigation, TriangleAlert } from 'lucide-react';
import { cn } from '../cn';

type Kind = 'NEW' | 'IN_ROUTE' | 'DELIVERED' | 'FAILED';

/**
 * Status de pedido.
 *
 * Três regras que valem mais que a estética aqui:
 *
 *  1. **Nunca só cor.** Sempre ícone + rótulo. Cerca de 8% dos homens têm
 *     alguma deficiência na visão de cores, e o público deste produto é
 *     majoritariamente masculino.
 *  2. **Entregue recua.** Fica cinza e discreto, não verde comemorativo: já
 *     está resolvido e não deve competir por atenção com o que ainda precisa
 *     de decisão. A tela é uma fila de trabalho, não um placar.
 *  3. **Vermelho é só falha.** Nunca decoração, nunca marca.
 */
const STYLES: Record<Kind, { label: string; className: string; Icon: typeof Check }> = {
  NEW: {
    label: 'Aguardando',
    className: 'bg-surface text-ink hairline',
    Icon: CircleDashed,
  },
  IN_ROUTE: {
    label: 'Em rota',
    className: 'bg-moving-soft text-moving',
    Icon: Navigation,
  },
  DELIVERED: {
    label: 'Entregue',
    className: 'bg-transparent text-ink-faint',
    Icon: Check,
  },
  FAILED: {
    label: 'Não entregue',
    className: 'bg-danger-soft text-danger',
    Icon: TriangleAlert,
  },
};

export function StatusPill({ status, className }: { status: Kind; className?: string }) {
  const { label, className: tone, Icon } = STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
