'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bike, Maximize2 } from 'lucide-react';
import type { RotaNoMapa } from '@/presentation/queries';
import type { MapMarker, MapRoute } from './route-map';
import { clockTime, timeAgo } from '../format';

// Leaflet mexe em `window` na importação: só carrega no navegador.
const RouteMap = dynamic(() => import('./route-map').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});

/**
 * Cores dos motoboys no mapa.
 *
 * Escolhidas para se distinguirem também para quem não separa vermelho de
 * verde — a forma mais comum de daltonismo. Por isso variam em luminosidade,
 * não só em matiz: numa impressão em preto e branco, ainda dá para diferenciar.
 */
const CORES = [
  'oklch(56% 0.16 258)',
  'oklch(65% 0.19 35)',
  'oklch(48% 0.14 300)',
  'oklch(70% 0.15 195)',
  'oklch(58% 0.17 145)',
  'oklch(62% 0.16 85)',
] as const;

/**
 * Onde estão os motoboys, agora.
 *
 * A tela que o dono deixa aberta no sábado à noite. Centrada na loja porque é
 * dali que todos saem — centrar na média das posições faria o mapa pular a cada
 * ping, e mapa que se move sozinho é ilegível.
 */
export function CouriersMap({
  rotas,
  loja,
  cheia = false,
}: {
  rotas: RotaNoMapa[];
  loja: { lat: number; lng: number; nome: string };
  /** Em tela cheia some o cabeçalho e o botão de expandir. */
  cheia?: boolean;
}) {
  const comCor = rotas.map((rota, i) => ({ ...rota, cor: CORES[i % CORES.length] }));

  const markers: MapMarker[] = [
    { lat: loja.lat, lng: loja.lng, label: loja.nome, kind: 'origin' },
  ];

  for (const rota of comCor) {
    for (const parada of rota.paradas) {
      markers.push({
        lat: parada.lat,
        lng: parada.lng,
        /* O rótulo carrega o motoboy: com três rotas no mapa, "3. Ana" sozinho
         * não diz de quem é a terceira parada. */
        label: `${parada.numero}. ${parada.cliente} — ${rota.courierName}`,
        kind: parada.entregue ? 'done' : 'stop',
        numero: parada.numero,
        cor: rota.cor,
      });
    }

    if (rota.posicao) {
      markers.push({
        lat: rota.posicao.lat,
        lng: rota.posicao.lng,
        label: rota.courierName,
        kind: 'courier',
        cor: rota.cor,
      });
    }
  }

  const routes: MapRoute[] = comCor.map((r) => ({ geometry: r.geometry, cor: r.cor }));

  return (
    <section className={cheia ? 'flex h-dvh flex-col' : 'rounded-lg bg-surface hairline'}>
      {cheia ? null : (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bike className="size-4 text-ink-faint" aria-hidden />
            <h2 className="text-sm font-medium text-ink">
              {rotas.length === 0 ? 'Ninguém em rota agora' : `${rotas.length} em rota`}
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

      <div className={cheia ? 'flex-1' : 'h-80 overflow-hidden'}>
        <RouteMap
          markers={markers}
          routes={routes}
          center={{ lat: loja.lat, lng: loja.lng }}
          className="h-full w-full"
        />
      </div>

      {/*
        A legenda não é enredo: o pino mostra o número, não de quem ele é. Sem
        ela, saber que a rota azul é do Jefferson exige clicar num pino.
      */}
      {comCor.length > 0 ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-3 text-xs">
          {comCor.map((rota) => {
            const feitas = rota.paradas.filter((p) => p.entregue).length;
            return (
              <li key={rota.routeId} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: rota.cor }}
                />
                <span className="text-ink">{rota.courierName}</span>
                <span className="text-ink-faint">
                  {feitas}/{rota.paradas.length}
                  {/*
                    O retorno vem antes da última posição de propósito: é a
                    pergunta que o dono realmente faz — não "onde ele está", mas
                    "quando posso mandar a próxima leva".
                  */}
                  {rota.retornoPrevisto ? (
                    <>
                      {' '}· volta{' '}
                      <span className="text-ink" suppressHydrationWarning>
                        {clockTime(rota.retornoPrevisto)}
                      </span>
                    </>
                  ) : null}
                  {/*
                    O motivo, e não só a ausência. "Sem rastreio" sozinho não
                    diz se o dono liga cobrando, espera, ou se o problema é
                    nosso — e as três reações são diferentes.
                  */}
                  {' · '}
                  {rota.rastreio === 'no mapa' && rota.posicao ? (
                    <>
                      <span suppressHydrationWarning>{timeAgo(rota.posicao.at)}</span>
                      {/*
                        A origem muda o significado do pino. GPS é onde ele
                        está; "entrega" é onde ele esteve, no portão do último
                        cliente — e pode já ter andado muito desde então.
                      */}
                      <span className="text-ink-faint"> · {rota.posicao.origem}</span>
                    </>
                  ) : (
                    <span className={rota.rastreio === 'recusou o rastreio' ? 'text-amber-700' : ''}>
                      {rota.rastreio}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
