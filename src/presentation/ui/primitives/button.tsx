import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

/**
 * Botão.
 *
 * `touch` existe para a tela do motoboy: 56px de altura mínima, que é o alvo
 * confortável para polegar em movimento — e o padrão de 36px de dashboard
 * simplesmente não funciona com luva, de moto parada, sob sol.
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
    'transition-colors disabled:pointer-events-none disabled:opacity-45 ' +
    '[&_svg]:shrink-0 [&_svg]:size-4',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-accent/85',
        neutral: 'bg-ink text-canvas hover:bg-ink/85',
        outline: 'bg-surface text-ink hairline hover:bg-raised',
        ghost: 'text-ink-muted hover:bg-raised hover:text-ink',
        danger: 'bg-danger text-white hover:bg-danger/85',
      },
      size: {
        sm: 'h-8 rounded-sm px-2.5 text-xs',
        md: 'h-9 rounded-md px-3.5 text-sm',
        lg: 'h-11 rounded-md px-5 text-sm',
        touch: 'min-h-14 rounded-lg px-5 text-base [&_svg]:size-5',
        icon: 'size-9 rounded-md',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

interface Props
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(button({ variant, size }), className)} {...props} />;
}
