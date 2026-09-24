import { Package } from 'lucide-react';
import type { HistoricoDoDia as Historico } from '@/presentation/historico-do-motoboy';
import { clockTime, currency } from '../format';

/**
 * As entregas que ele concluiu hoje, e a soma do que tem a receber.
 *
 * Dia vazio não mostra R$ 0,00: zero pareceria uma conta fechada. Sem acordo,
 * a lista fica e o valor não — inventar salário é pior do que dizer que a loja
 * ainda não combinou.
 */
export function HistoricoDoDia({
  historico,
  mostrarTitulo = false,
}: {
  historico: Historico | null;
  /** Na espera, sem aba, o título precisa estar no próprio bloco. */
  mostrarTitulo?: boolean;
}) {
  if (!historico) {
    return (
      <div className="px-4 py-8 text-center">
        {mostrarTitulo ? <Titulo /> : null}
        <p className="text-base text-ink">Não deu para carregar as entregas de hoje.</p>
      </div>
    );
  }

  if (historico.linhas.length === 0) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10 text-center">
        <div className="space-y-2">
          {mostrarTitulo ? <Titulo /> : null}
          <Package className="mx-auto size-8 text-ink-faint" aria-hidden />
          <p className="text-lg font-medium text-ink">Nenhuma entrega hoje</p>
          <p className="text-sm text-ink-muted">
            Quando você tocar em Entreguei, ela entra aqui.
          </p>
        </div>
      </div>
    );
  }

  const uma = historico.linhas.length === 1;

  return (
    <section className="flex flex-1 flex-col px-4 py-5">
      {mostrarTitulo ? <Titulo /> : null}

      {historico.semAcordo || historico.totalCents == null ? (
        <div>
          <p className="text-lg font-semibold text-ink">
            <span className="numeric">{historico.linhas.length}</span>{' '}
            {uma ? 'entrega' : 'entregas'} hoje
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            A loja ainda não combinou quanto você recebe. As entregas estão aqui; o valor aparece
            quando o acordo estiver definido.
          </p>
        </div>
      ) : (
        <div>
          <p className="numeric text-3xl font-semibold tracking-tight text-ink">
            {currency(historico.totalCents)}
          </p>
          <p className="text-sm text-ink-muted">a receber hoje</p>
          <p className="mt-1 text-xs text-ink-faint">
            <span className="numeric">{historico.linhas.length}</span>{' '}
            {uma ? 'entrega' : 'entregas'}
          </p>
        </div>
      )}

      <ul className="mt-4 overflow-hidden rounded-lg bg-surface">
        {historico.linhas.map((linha) => (
          <li key={linha.id} className="border-b px-3 py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-base font-medium text-ink">{linha.cliente}</p>
              {linha.aReceberCents != null ? (
                <span className="numeric shrink-0 text-sm font-medium text-ink">
                  {currency(linha.aReceberCents)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-ink-muted">{linha.endereco}</p>
            <p className="numeric mt-1 text-xs text-ink-faint">{clockTime(linha.quando)}</p>
          </li>
        ))}

        {historico.diariasCents > 0 ? (
          <li className="flex items-baseline justify-between gap-3 border-t px-3 py-3">
            <p className="text-sm text-ink-muted">Diária de hoje</p>
            <span className="numeric text-sm font-medium text-ink">
              {currency(historico.diariasCents)}
            </span>
          </li>
        ) : null}
      </ul>

      {historico.semAcordo || historico.totalCents == null ? null : (
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Pelo acordo com a loja. Só o que você já entregou hoje.
        </p>
      )}
    </section>
  );
}

function Titulo() {
  return <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Hoje</h2>;
}
