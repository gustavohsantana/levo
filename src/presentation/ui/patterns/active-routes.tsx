import Link from 'next/link';
import { Bike, Check } from 'lucide-react';
import type { RouteView } from '@/presentation/queries';
import { Button } from '../primitives';
import { distance, minutes } from '../format';
import { CopyLink } from './copy-link';
import { StartRouteButton } from './start-route-button';

/** As rotas que estão na rua agora — a segunda coisa que o dono quer ver. */
export function ActiveRoutes({ routes }: { routes: RouteView[] }) {
  if (routes.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-ink">Na rua agora</h2>

      <div className="grid gap-3 lg:grid-cols-2">
        {routes.map((route) => {
          const done = route.stops.filter((stop) => stop.status !== 'PENDING').length;

          return (
            <article key={route.id} className="rounded-lg bg-surface p-4 hairline">
              <header className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-md bg-moving-soft text-moving">
                  <Bike className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{route.courierName}</p>
                  <p className="text-xs text-ink-muted">
                    {route.status === 'PLANNED' ? 'Aguardando saída' : 'Em rota'} ·{' '}
                    <span className="numeric">{done}</span>/
                    <span className="numeric">{route.stops.length}</span> entregues
                  </p>
                </div>

                {route.savedMinutes > 0 ? (
                  <span className="numeric rounded-xs bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink">
                    −{route.savedMinutes} min
                  </span>
                ) : null}
              </header>

              {/* Progresso por parada: mais legível que uma barra percentual. */}
              <ol className="mt-3 flex gap-1" aria-label="Progresso das paradas">
                {route.stops.map((stop) => (
                  <li
                    key={stop.id}
                    title={`${stop.position}. ${stop.customerName}`}
                    className={
                      'h-1.5 flex-1 rounded-full ' +
                      (stop.status === 'DELIVERED'
                        ? 'bg-accent'
                        : stop.status === 'FAILED'
                          ? 'bg-danger'
                          : 'bg-line')
                    }
                  />
                ))}
              </ol>

              <dl className="mt-3 flex gap-5 text-xs text-ink-muted">
                <div className="flex items-baseline gap-1.5">
                  <dt className="sr-only">Duração prevista</dt>
                  <dd className="numeric font-medium text-ink">{minutes(route.durationSeconds)}</dd>
                  <span>previstos</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="sr-only">Distância</dt>
                  <dd className="numeric font-medium text-ink">{distance(route.distanceMeters)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {route.status === 'PLANNED' ? <StartRouteButton routeId={route.id} /> : null}
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/rotas/${route.id}`}>Acompanhar no mapa</Link>
                </Button>
                <CopyLink
                  whatsappLink={route.courierWhatsappLink}
                  path={`/m/${route.accessToken}`}
                  label="Copiar link do motoboy"
                  done={
                    <>
                      <Check className="size-3.5" /> Link copiado
                    </>
                  }
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
