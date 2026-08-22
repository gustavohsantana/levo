import { cn } from '../cn';

/**
 * Estado vazio que ensina.
 *
 * "Nenhum pedido" sozinho é um beco sem saída. O primeiro uso do sistema é
 * sempre um estado vazio, então ele é o onboarding real do produto — por isso
 * exige uma ação, não só um texto cinza.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <Icon className="size-7 text-ink-faint" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
