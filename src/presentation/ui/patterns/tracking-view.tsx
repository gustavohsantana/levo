'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, ChefHat, Bike, TriangleAlert } from 'lucide-react';
import type { TrackingSnapshot } from '@/application/use-cases/tracking/get-tracking-snapshot';
import type { MapMarker } from './route-map';
import { PedidoPassos } from './pedido-passos';
import { lerLojaDoFluxo } from '@/presentation/menu-session';
import { clockTime, timeAgo } from '../format';

// Leaflet mexe em `window` na importação: só carrega no navegador.
const RouteMap = dynamic(() => import('./route-map').then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});

const POLL_MS = 10_000;

/**
 * A página que o cliente final abre.
 *
 * Uma pergunta só: "está chegando?". Sem menu, sem login, sem marca do Levô
 * competindo com a do estabelecimento — quem pediu a pizza tem relação com a
 * pizzaria, não conosco.
 *
 * Atualiza por sondagem de 10s em vez de WebSocket: em ambiente serverless o
 * WebSocket é caro e frágil, e 10 segundos de defasagem são irrelevantes para
 * quem está esperando comida.
 */
export function TrackingView({
  token,
  initial,
}: {
  token: string;
  initial: TrackingSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    setSlug(lerLojaDoFluxo());
  }, []);

  useEffect(() => {
    if (snapshot.status === 'DELIVERED' || snapshot.status === 'FAILED') return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/tracking/${token}`, { cache: 'no-store' });
        if (response.ok) setSnapshot(await response.json());
      } catch {
        // Sem rede: mantém o último estado conhecido na tela. Melhor um dado de
        // 30 segundos atrás que uma mensagem de erro para quem só quer saber
        // se a comida está perto.
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [token, snapshot.status]);

  const markers: MapMarker[] = [];
  if (snapshot.destination) {
    markers.push({ ...snapshot.destination, label: 'Seu endereço', kind: 'destination' });
  }
  if (snapshot.courierPosition) {
    markers.push({
      lat: snapshot.courierPosition.lat,
      lng: snapshot.courierPosition.lng,
      label: 'Entregador',
      kind: 'courier',
    });
  }

  return (
    <>
      {slug ? <PedidoPassos slug={slug} atual="acompanhar" /> : null}
      <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="px-5 pb-4 pt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {snapshot.establishmentName}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {headline(snapshot)}
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">{detail(snapshot)}</p>
      </header>

      {/*
        O código fica antes do mapa, e grande.
        
        O cliente abre esta tela com o entregador na porta e a moto ligada. Ele
        precisa achar o número em um relance — não rolar a tela procurando.
      */}
      {snapshot.deliveryCode && snapshot.status === 'ON_THE_WAY' ? (
        <div className="mx-5 mb-4 rounded-lg bg-accent-soft px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-ink">
            Código de confirmação
          </p>
          <p className="numeric mt-1 text-3xl font-semibold tracking-[0.2em] text-accent-ink">
            {snapshot.deliveryCode}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-accent-ink/80">
            Informe ao entregador na hora de receber.
          </p>
        </div>
      ) : null}

      {snapshot.status === 'ON_THE_WAY' && markers.length > 0 ? (
        <div className="mx-5 mb-4 h-72 overflow-hidden rounded-lg hairline">
          <RouteMap markers={markers} geometry={snapshot.routeGeometry} className="h-full w-full" />
        </div>
      ) : null}

      <Timeline status={snapshot.status} />

      {/*
        "há 2 min" é calculado contra o relógio de quem renderiza, e servidor e
        navegador nunca marcam o mesmo instante. `suppressHydrationWarning` é a
        saída que o próprio React indica para conteúdo dependente de tempo: o
        valor do cliente prevalece, sem acusar divergência.
      */}
      {snapshot.courierPosition ? (
        <p className="px-5 pb-8 text-xs text-ink-faint" suppressHydrationWarning>
          Posição atualizada {timeAgo(snapshot.courierPosition.at)}.
        </p>
      ) : (
        <div className="pb-8" />
      )}
    </main>
    </>
  );
}

function headline(snapshot: TrackingSnapshot): string {
  switch (snapshot.status) {
    case 'DELIVERED':
      return 'Entregue!';
    case 'FAILED':
      return 'Não foi possível entregar';
    case 'PREPARING':
      return `Preparando seu pedido, ${snapshot.customerFirstName}`;
    case 'ON_THE_WAY':
      return snapshot.stopsAhead === 0
        ? 'Seu pedido é a próxima entrega'
        : 'Seu pedido saiu para entrega';
  }
}

function detail(snapshot: TrackingSnapshot): string {
  if (snapshot.status === 'DELIVERED') return 'Bom apetite.';
  if (snapshot.status === 'FAILED') return 'Entre em contato com o estabelecimento.';
  if (snapshot.status === 'PREPARING') return 'Avisamos aqui assim que o entregador sair.';

  const eta = snapshot.estimatedArrival
    ? ` Previsão de chegada por volta das ${clockTime(snapshot.estimatedArrival)}.`
    : '';

  if (snapshot.stopsAhead === 0) return `O entregador está a caminho.${eta}`;

  // Contar entregas à frente é mais honesto e mais útil que um cronômetro que
  // reseta: dá noção real de fila, e ninguém se sente enganado se atrasar.
  return snapshot.stopsAhead === 1
    ? `Falta 1 entrega antes da sua.${eta}`
    : `Faltam ${snapshot.stopsAhead} entregas antes da sua.${eta}`;
}

const STEPS = [
  { key: 'PREPARING', label: 'Preparando', Icon: ChefHat },
  { key: 'ON_THE_WAY', label: 'A caminho', Icon: Bike },
  { key: 'DELIVERED', label: 'Entregue', Icon: Check },
] as const;

function Timeline({ status }: { status: TrackingSnapshot['status'] }) {
  if (status === 'FAILED') {
    return (
      <div className="mx-5 flex items-center gap-2.5 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
        <TriangleAlert className="size-4" aria-hidden />
        Entrega não concluída
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <ol className="flex items-center gap-2 px-5">
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={step.key} className="flex flex-1 flex-col items-center gap-2">
            {/* Barra fina, não bloco: informa o progresso sem dominar a tela. */}
            <span
              className={
                'h-1 w-full rounded-full ' + (reached ? 'bg-accent' : 'bg-line')
              }
            />
            <span className="flex items-center gap-1.5">
              <step.Icon
                className={'size-3.5 ' + (reached ? 'text-accent-ink' : 'text-ink-faint')}
                aria-hidden
              />
              <span
                className={
                  'text-xs ' +
                  (isCurrent ? 'font-medium text-ink' : reached ? 'text-ink-muted' : 'text-ink-faint')
                }
              >
                {step.label}
              </span>
            </span>
            {isCurrent ? <span className="sr-only">(situação atual)</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
