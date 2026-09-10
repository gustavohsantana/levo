import Link from 'next/link';
import { currency } from '../format';
import type { AcertoDoDia as AcertoDoDiaData } from '@/presentation/reports';

/**
 * O acerto de hoje, por motoboy — a pergunta do fim do turno.
 *
 * O dono lembrava de ver isto no painel e não via: o valor a acertar só existia
 * no perfil de cada um, um clique de cada vez. Aqui fica somado e à vista, no
 * dia, sem trocar de tela — mas só quando há entrega, porque bloco que aparece
 * vazio vira ruído na dobra da tela mais usada.
 *
 * Cada motoboy leva ao perfil dele, onde se ajusta o acordo e se vê o período.
 * "Sem acordo" vira um aviso vermelho no lugar do valor: R$ 0,00 esconderia o
 * problema, e o motoboy descobriria no fim da semana.
 */
export function AcertoDoDia({ acerto }: { acerto: AcertoDoDiaData }) {
  if (acerto.entregadores.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">Acerto de hoje</h2>
        <p className="flex items-baseline gap-1.5">
          <span className="numeric text-base font-semibold text-ink">
            {currency(acerto.totalCents)}
          </span>
          <span className="text-xs text-ink-faint">a acertar</span>
        </p>
      </div>

      <ul className="mt-2 overflow-hidden rounded-lg bg-surface hairline">
        {acerto.entregadores.map((e) => (
          <li key={e.id} className="border-b last:border-b-0">
            <Link
              href={`/dashboard/entregadores/${e.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-raised"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{e.nome}</p>
                <p className="text-xs text-ink-faint">
                  {e.entregas} {e.entregas === 1 ? 'entrega' : 'entregas'}
                </p>
              </div>

              {e.semAcordo ? (
                <span className="text-xs font-medium text-danger">combine o acordo</span>
              ) : (
                <span className="numeric text-sm font-medium text-ink">
                  {currency(e.aPagarCents)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
        Pelas entregas de hoje, no acordo de cada um. O fechamento do período fica em Relatórios.
      </p>
    </section>
  );
}
