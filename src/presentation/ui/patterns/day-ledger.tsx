import { minutes } from '../format';

/**
 * O dia em uma linha.
 *
 * A economia de tempo vem primeiro e em destaque tipográfico porque é a
 * pergunta que o piloto existe para responder — e é o número que o dono repete
 * quando alguém pergunta se o Levô serve para alguma coisa.
 */
export function DayLedger({
  establishmentName,
  today,
}: {
  establishmentName: string;
  today: { orders: number; delivered: number; routes: number; savedMinutes: number };
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <h1 className="text-xl font-semibold tracking-tight text-ink">{establishmentName}</h1>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-ink-muted">
        <Stat value={today.orders} label={today.orders === 1 ? 'pedido hoje' : 'pedidos hoje'} />
        <Stat value={today.delivered} label="entregues" />
        <Stat value={today.routes} label={today.routes === 1 ? 'rota' : 'rotas'} />
      </div>

      {today.savedMinutes > 0 ? (
        <p className="ml-auto flex items-baseline gap-1.5 rounded-md bg-accent-soft px-2.5 py-1">
          <span className="numeric text-base font-semibold text-accent-ink">
            {minutes(today.savedMinutes * 60)}
          </span>
          <span className="text-xs text-accent-ink/75">economizados hoje</span>
        </p>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="numeric font-medium text-ink">{value}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}
