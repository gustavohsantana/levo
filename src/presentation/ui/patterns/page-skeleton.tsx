/**
 * O esqueleto que aparece enquanto a página carrega.
 *
 * Toda tela do painel é `force-dynamic` e consulta o banco — então trocar de
 * aba tem um custo real de ida e volta. Sem nada na tela, esse tempo parece
 * travamento; com a forma do conteúdo desenhada, parece carregamento. É o
 * mesmo tempo, e a diferença é entre "quebrou" e "está vindo".
 */
export function PageSkeleton({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy role="status">
      <span className="sr-only">Carregando…</span>

      <div>
        <div className="h-6 w-48 rounded bg-raised" />
        <div className="mt-2 h-4 w-72 rounded bg-raised/70" />
      </div>

      <div className="overflow-hidden rounded-lg bg-surface hairline">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b px-4 py-4 last:border-b-0">
            <div className="size-8 shrink-0 rounded bg-raised" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-1/3 rounded bg-raised" />
              <div className="mt-1.5 h-3 w-1/2 rounded bg-raised/70" />
            </div>
            <div className="h-4 w-16 rounded bg-raised/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
