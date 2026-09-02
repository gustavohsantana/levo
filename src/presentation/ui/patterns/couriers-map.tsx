'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Maximize2, Bike } from 'lucide-react';
import type { CourierView } from '@/presentation/queries';
import type { MapMarker } from './route-map';
import { timeAgo } from '../format';

// Leaflet mexe em `window` na importação: só carrega no navegador.
const RouteMap = dynamic(() => import('./route-map').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});

/**
 * Onde estão os motoboys, agora.
 *
 * A tela que o dono deixa aberta no sábado à noite. Centrada na loja porque é
 * dali que todo mundo sai — centrar na média das posições faria o mapa pular a
 * cada ping, e um mapa que se move sozinho é ilegível.
 */
export function CouriersMap({
  entregadores,
  loja,
  cheia = false,
}: {
  entregadores: CourierView[];
  loja: { lat: number; lng: number; nome: string };
  /** Em tela cheia some o cabeçalho e o botão de expandir. */
  cheia?: boolean;
}) {
  const emRota = entregadores.filter((e) => e.posicao);

  const markers: MapMarker[] = [
    { lat: loja.lat, lng: loja.lng, label: loja.nome, kind: 'origin' },
    ...emRota.map((e) => ({
      lat: e.posicao!.lat,
      lng: e.posicao!.lng,
      label: e.name,
      kind: 'courier' as const,
    })),
  ];

  return (
    <section className={cheia ? 'flex h-dvh flex-col' : 'rounded-lg bg-surface hairline'}>
      {cheia ? null : (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bike className="size-4 text-ink-faint" aria-hidden />
            <h2 className="text-sm font-medium text-ink">
              {emRota.length === 0
                ? 'Ninguém em rota agora'
                : `${emRota.length} em rota`}
            </h2>
          </div>

          <Link
            href="/mapa"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
          >
            <Maximize2 className="size-3.5" aria-hidden />
            Abrir em tela cheia
          </Link>
        </div>
      )}

      <div className={cheia ? 'flex-1' : 'h-72 overflow-hidden rounded-b-lg'}>
        <RouteMap markers={markers} className="h-full w-full" />
      </div>

      {/*
        A lista embaixo do mapa não é redundante: pino sem nome legível obriga o
        dono a passar o mouse um por um, e no celular nem isso existe.
      */}
      {emRota.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-ink-muted">
          {emRota.map((e) => (
            <li key={e.id}>
              <span className="text-ink">{e.name}</span>{' '}
              <span suppressHydrationWarning>{timeAgo(e.posicao!.at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
