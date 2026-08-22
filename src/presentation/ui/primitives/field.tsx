import { cn } from '../cn';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {/* O erro substitui a dica: dois textos embaixo do campo viram ruído. */}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 rounded-md bg-surface px-3 text-sm text-ink hairline',
        'placeholder:text-ink-faint',
        'transition-shadow focus:shadow-[inset_0_0_0_1px_var(--accent)]',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-20 rounded-md bg-surface px-3 py-2 text-sm text-ink hairline',
        'placeholder:text-ink-faint resize-y',
        'transition-shadow focus:shadow-[inset_0_0_0_1px_var(--accent)]',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 rounded-md bg-surface px-2.5 text-sm text-ink hairline',
        'transition-shadow focus:shadow-[inset_0_0_0_1px_var(--accent)]',
        className,
      )}
      {...props}
    />
  );
}
