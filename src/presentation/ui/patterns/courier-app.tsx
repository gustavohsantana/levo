'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  CloudOff,
  MapPin,
  Navigation,
  Package,
  Phone,
  TriangleAlert,
} from 'lucide-react';
import type { DriverRouteView, DriverStopView } from '@/presentation/driver-queries';
import { Button } from '../primitives';
import { cn } from '../cn';
import { currency, phoneDisplay } from '../format';
import { enqueue, flush, peek } from '../offline-queue';

const PING_INTERVAL_MS = 15_000;

/**
 * A tela do motoboy.
 *
 * Nada aqui se parece com o painel do dono, de propósito — é outro contexto:
 * uma mão, moto parada, sol na tela, às vezes luva. As decisões que seguem daí:
 *
 *  • tema escuro fixo (roda de noite);
 *  • UMA parada em foco por vez, gigante — o resto é lista secundária;
 *  • botões de 56px+, que é o alvo confortável para polegar;
 *  • confirmação otimista com fila offline: o toque SEMPRE responde na hora,
 *    mesmo sem sinal;
 *  • sem senha — o link é a credencial.
 */
export function CourierApp({ token, route }: { token: string; route: DriverRouteView }) {
  const router = useRouter();
  const [pendingSync, setPendingSync] = useState(0);
  /**
   * Conexão é estado que vive fora do React — o navegador é dono dele.
   * `useSyncExternalStore` é a API feita para exatamente isso: assina a fonte
   * externa sem espelhar o valor num estado local que pode ficar defasado, e
   * sem risco de divergir entre servidor e cliente na hidratação.
   */
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  /** Paradas confirmadas localmente e ainda não refletidas pelo servidor. */
  // `undefined` explícito: sem ele o TypeScript assume que todo id existe no
  // mapa e considera o fallback para o status do servidor código morto.
  const [resolvedLocally, setResolvedLocally] = useState<
    Record<string, 'DELIVERED' | 'FAILED' | undefined>
  >({});

  const stops = useMemo(
    () =>
      route.stops.map((stop) => ({
        ...stop,
        status: resolvedLocally[stop.id] ?? stop.status,
      })),
    [route.stops, resolvedLocally],
  );

  const pending = stops.filter((stop) => stop.status === 'PENDING');
  const current = pending[0] ?? null;
  const done = stops.length - pending.length;

  // ── Sincronização da fila offline ──────────────────────────────────────
  const sync = useCallback(async () => {
    const sent = await flush();
    setPendingSync((await peek()).length);
    if (sent > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    // `online` nas dependências de propósito: quando o sinal volta, o efeito
    // roda de novo e a fila esvazia na hora, sem esperar o próximo ciclo.
    const periodic = setInterval(sync, 20_000);
    const immediate = setTimeout(sync, 0);

    return () => {
      clearInterval(periodic);
      clearTimeout(immediate);
    };
  }, [sync, online]);

  // ── GPS ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (route.status !== 'IN_PROGRESS' || !navigator.geolocation) return;

    let last = 0;

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        // `watchPosition` dispara a cada metro andado; o servidor não precisa
        // disso. Uma posição a cada 15s é suficiente para o mapa do cliente e
        // economiza bateria — que no fim do turno é o que decide se o motoboy
        // deixa o app aberto.
        const now = Date.now();
        if (now - last < PING_INTERVAL_MS) return;
        last = now;

        void fetch('/api/driver/ping', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
          keepalive: true,
        }).catch(() => {
          // Posição perdida não é problema: a próxima chega em 15s. Não vale
          // uma fila offline, ao contrário da confirmação de entrega.
        });
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [route.status, token]);

  // ── Ações ──────────────────────────────────────────────────────────────
  async function resolveStop(stop: DriverStopView, outcome: 'DELIVERED' | 'FAILED') {
    const reason = outcome === 'FAILED' ? window.prompt('O que aconteceu?') : null;
    if (outcome === 'FAILED' && reason === null) return;

    // Confirma na tela ANTES de falar com o servidor. Sem isso, o motoboy
    // espera o giro de carregamento parado no portão do cliente.
    setResolvedLocally((current) => ({ ...current, [stop.id]: outcome }));

    const item = {
      token,
      stopId: stop.id,
      outcome,
      reason,
      occurredAt: new Date().toISOString(),
    };

    await enqueue(item);
    await sync();
  }

  if (route.status === 'FINISHED' || pending.length === 0) {
    return (
      <Shell>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div className="space-y-3">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-ink">
              <Check className="size-7" aria-hidden />
            </span>
            <p className="text-xl font-semibold text-ink">Rota concluída</p>
            <p className="text-sm text-ink-muted">
              <span className="numeric">{done}</span> de{' '}
              <span className="numeric">{stops.length}</span> entregas finalizadas. Bom trabalho,{' '}
              {route.courierName.split(' ')[0]}.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{route.establishmentName}</p>
          <p className="text-xs text-ink-muted">
            <span className="numeric">{done}</span> de{' '}
            <span className="numeric">{stops.length}</span> entregues
          </p>
        </div>

        {/*
          Estado da conexão sempre visível. O motoboy precisa saber que o que
          ele marcou está guardado, mesmo sem sinal — senão ele remarca, ou
          desiste do app.
        */}
        {!online || pendingSync > 0 ? (
          <span className="flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 text-xs text-warning">
            <CloudOff className="size-3.5" aria-hidden />
            {pendingSync > 0 ? `${pendingSync} p/ enviar` : 'Sem conexão'}
          </span>
        ) : null}
      </header>

      {current ? <CurrentStop stop={current} onResolve={resolveStop} /> : null}

      {pending.length > 1 ? (
        <section className="border-t px-4 py-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Depois desta
          </h2>
          <ol className="space-y-1.5">
            {pending.slice(1).map((stop) => (
              <li key={stop.id} className="flex items-start gap-2.5 text-sm">
                <span className="numeric mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs bg-raised text-xs text-ink-muted">
                  {stop.position}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{stop.customerName}</span>
                  <span className="block truncate text-xs text-ink-muted">{stop.address}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </Shell>
  );
}

function subscribeToConnection(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** O tema escuro é do container, não do documento: só esta tela é escura. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="flex min-h-dvh flex-col bg-canvas text-ink">
      {children}
    </div>
  );
}

function CurrentStop({
  stop,
  onResolve,
}: {
  stop: DriverStopView;
  onResolve: (stop: DriverStopView, outcome: 'DELIVERED' | 'FAILED') => void;
}) {
  const [busy, setBusy] = useState(false);

  async function act(outcome: 'DELIVERED' | 'FAILED') {
    setBusy(true);
    await onResolve(stop, outcome);
    setBusy(false);
  }

  return (
    <section className="flex flex-1 flex-col gap-5 px-4 py-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
          <MapPin className="size-3.5" aria-hidden />
          Parada {stop.position}
        </p>

        {/*
          O teste do relance: isto precisa ser legível a um braço de distância,
          sob sol, sem tirar a luva. É o tamanho que define a tipografia aqui,
          não o gosto de quem desenhou.
        */}
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">
          {stop.customerName}
        </h1>

        <p className="mt-2 text-lg leading-snug text-ink-muted">{stop.address}</p>

        {stop.reference ? (
          <p className="mt-1 text-base text-ink-faint">{stop.reference}</p>
        ) : null}

        {stop.notes ? (
          <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-base text-ink">
            {stop.notes}
          </p>
        ) : null}

        <p className="numeric mt-3 text-lg font-medium text-ink">{currency(stop.amountCents)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="touch"
          variant="outline"
          asChild
          className={cn(!stop.coordinates && 'pointer-events-none opacity-40')}
        >
          {/*
            Abre o app de navegação que o motoboy já usa e confia. Reimplementar
            navegação passo a passo dentro do produto seria competir com o Waze
            e perder — e ele nem quer isso.
          */}
          <a
            href={
              stop.coordinates
                ? `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}&travelmode=driving`
                : '#'
            }
            target="_blank"
            rel="noreferrer"
          >
            <Navigation />
            Navegar
          </a>
        </Button>

        <Button
          size="touch"
          variant="outline"
          asChild
          className={cn(!stop.customerPhone && 'pointer-events-none opacity-40')}
        >
          <a href={stop.customerPhone ? `tel:+55${stop.customerPhone}` : '#'}>
            <Phone />
            {stop.customerPhone ? phoneDisplay(stop.customerPhone) : 'Sem telefone'}
          </a>
        </Button>
      </div>

      <div className="mt-auto space-y-2">
        <Button
          size="touch"
          variant="primary"
          className="w-full text-lg font-semibold"
          disabled={busy}
          onClick={() => act('DELIVERED')}
        >
          <Check />
          Entreguei
        </Button>

        <Button
          size="touch"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => act('FAILED')}
        >
          <TriangleAlert />
          Não consegui entregar
        </Button>
      </div>
    </section>
  );
}

export function CourierEmpty() {
  return (
    <Shell>
      <div className="grid flex-1 place-items-center px-6 text-center">
        <div className="space-y-2">
          <Package className="mx-auto size-8 text-ink-faint" aria-hidden />
          <p className="text-lg font-medium text-ink">Nenhuma rota neste link</p>
          <p className="text-sm text-ink-muted">Peça um link novo ao estabelecimento.</p>
        </div>
      </div>
    </Shell>
  );
}
