import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { primeirosPassos, type EstadoDaLoja } from '@/core/services/primeiros-passos';

/**
 * O roteiro de quem acabou de criar a loja.
 *
 * Fica acima da fila de trabalho, e só enquanto falta o essencial. É a única
 * coisa no painel que tem prazo de validade por desenho: cumprida a lista, ela
 * some e não volta.
 */
export function PrimeirosPassos({ loja }: { loja: EstadoDaLoja }) {
  const passos = primeirosPassos(loja);
  const feitos = passos.filter((p) => p.feito).length;

  return (
    <section
      aria-label="Primeiros passos"
      className="rounded-lg bg-accent-soft/40 p-4 hairline"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">Deixe sua loja pronta</h2>
        <p className="numeric text-xs text-ink-muted">
          {feitos} de {passos.length}
        </p>
      </div>

      <p className="mt-1 text-sm text-ink-muted">
        São quatro coisas, uma vez só. Depois disso o painel some com este aviso.
      </p>

      <ol className="mt-3 flex flex-col gap-1">
        {passos.map((passo) => (
          <li key={passo.id}>
            {passo.feito ? (
              /*
               * O passo pronto não vira link.
               *
               * Ele existe para a pessoa ver o progresso, não para ser clicado de
               * novo — e um link que leva de volta a algo já resolvido faz
               * duvidar se foi resolvido mesmo.
               */
              <p className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-faint">
                <Check className="size-4 shrink-0 text-accent-ink" aria-hidden />
                <span className="line-through">{passo.titulo}</span>
              </p>
            ) : (
              <Link
                href={passo.href}
                className="flex items-center gap-2 rounded-md px-2 py-2 transition hover:bg-surface"
              >
                <span
                  aria-hidden
                  className="size-4 shrink-0 rounded-full border border-line-strong"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{passo.titulo}</span>
                  <span className="block text-xs text-ink-muted">{passo.porque}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted">
                  {passo.rotulo}
                  <ChevronRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
