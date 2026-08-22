'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Check, Printer, TriangleAlert } from 'lucide-react';
import type { RouteView } from '@/presentation/queries';
import type { MapMarker } from './route-map';
import { Button } from '../primitives';
import { CopyLink } from './copy-link';
import { clockTime, distance, minutes } from '../format';

const RouteMap = dynamic(() => import('./route-map').then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});

const REFRESH_MS = 10_000;

export function RouteMonitor({
  route,
  establishment,
  trail,
}: {
  route: RouteView;
  establishment: { name: string; coordinates: { lat: number; lng: number } };
  /**
   * Vem do servidor a cada revalidação e é usado direto.
   *
   * Estava guardado num `useState`, que só lê o valor inicial: o `router
   * .refresh()` de 10 em 10 segundos trazia posições novas e a tela continuava
   * desenhando a primeira. O motoboy nunca saía do lugar no mapa do dono — que
   * é a única razão desta tela existir.
   */
  trail: Array<{ lat: number; lng: number; at: string }>;
}) {
  const router = useRouter();

  // Sondagem simples: revalida a página inteira. É barato porque o Next só
  // reenvia o que mudou, e evita manter uma segunda cópia do estado no cliente
  // que possa divergir do servidor.
  useEffect(() => {
    if (route.status === 'FINISHED') return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [route.status, router]);

  const markers: MapMarker[] = [
    { ...establishment.coordinates, label: establishment.name, kind: 'origin' },
    ...route.stops
      .filter((stop) => stop.coordinates)
      .map<MapMarker>((stop) => ({
        lat: stop.coordinates!.lat,
        lng: stop.coordinates!.lng,
        label: `${stop.position}. ${stop.customerName}`,
        kind: stop.status === 'PENDING' ? 'stop' : 'done',
      })),
  ];

  const last = trail.at(-1);
  if (last) markers.push({ lat: last.lat, lng: last.lng, label: 'Motoboy', kind: 'courier' });

  const done = route.stops.filter((stop) => stop.status !== 'PENDING').length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{route.courierName}</h1>
          <p className="text-sm text-ink-muted">
            {route.status === 'PLANNED'
              ? 'Aguardando saída'
              : route.status === 'IN_PROGRESS'
                ? 'Em rota'
                : 'Rota concluída'}{' '}
            · <span className="numeric">{done}</span>/
            <span className="numeric">{route.stops.length}</span> entregues
          </p>
        </div>

        <dl className="flex gap-6 text-sm">
          <Metric label="Previsto" value={minutes(route.durationSeconds)} />
          <Metric label="Distância" value={distance(route.distanceMeters)} />
          {route.savedMinutes > 0 ? (
            <Metric label="Economizado" value={`${route.savedMinutes} min`} highlight />
          ) : null}
        </dl>

        <div className="ml-auto flex gap-2 print:hidden">
          <CopyLink
            path={`/m/${route.accessToken}`}
            label="Link do motoboy"
            done={<><Check className="size-3.5" /> Copiado</>}
          />
          {/*
            Plano B do sábado à noite.

            Se o Levô cair no pico, o dono não pode parar de vender. O papel
            volta — mas agora com as paradas na ordem otimizada. Custa uma
            folha de estilo de impressão e é a diferença entre um susto e um
            cliente perdido.
          */}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer />
            Imprimir rota
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="h-[28rem] overflow-hidden rounded-lg hairline lg:h-[34rem] print:hidden">
          <RouteMap
            markers={markers}
            geometry={route.geometry}
            trail={trail}
            className="h-full w-full"
          />
        </div>

        <ol className="divide-y overflow-hidden rounded-lg bg-surface hairline">
          {route.stops.map((stop) => (
            <li key={stop.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={
                  'numeric mt-0.5 grid size-6 shrink-0 place-items-center rounded-xs text-xs font-medium ' +
                  (stop.status === 'DELIVERED'
                    ? 'bg-accent-soft text-accent-ink'
                    : stop.status === 'FAILED'
                      ? 'bg-danger-soft text-danger'
                      : 'bg-raised text-ink-muted')
                }
              >
                {stop.status === 'DELIVERED' ? (
                  <Check className="size-3.5" aria-hidden />
                ) : stop.status === 'FAILED' ? (
                  <TriangleAlert className="size-3.5" aria-hidden />
                ) : (
                  stop.position
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{stop.customerName}</p>
                <p className="truncate text-xs text-ink-muted">{stop.address}</p>
              </div>

              {route.startedAt && stop.status === 'PENDING' ? (
                <span className="numeric shrink-0 text-xs text-ink-faint">
                  {clockTime(new Date(new Date(route.startedAt).getTime() + stop.etaSeconds * 1000))}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd
        className={
          'numeric font-medium ' + (highlight ? 'text-accent-ink' : 'text-ink')
        }
      >
        {value}
      </dd>
    </div>
  );
}
