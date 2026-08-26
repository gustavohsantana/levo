'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  LoaderCircle,
  MapPin,
  MapPinOff,
  Plus,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react';
import { planRouteAction } from '@/presentation/actions';
import type { OrderView } from '@/presentation/queries';
import { Button, EmptyState, Select } from '../primitives';
import { OrderRow } from './order-row';
import type { ProductView } from '@/presentation/queries';
import { NewOrderDialog } from './new-order-dialog';
import { PinPickerDialog } from './pin-picker-dialog';

interface Courier {
  id: string;
  name: string;
  active: boolean;
  busy: boolean;
}

/**
 * A fila de trabalho: o que precisa de decisão agora.
 *
 * É o primeiro conteúdo da tela porque é a única coisa que o dono realmente faz
 * aqui — escolher pedidos, escolher motoboy, despachar. Tudo o mais é consulta.
 */
export function WorkQueue({
  pending,
  couriers,
  establishment,
  produtos = [],
}: {
  pending: OrderView[];
  couriers: Courier[];
  establishment: { name: string; coordinates: { lat: number; lng: number } };
  /** Catálogo, para montar o pedido sem digitar preço. */
  produtos?: ProductView[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastAnchor, setLastAnchor] = useState<string | null>(null);
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ savedMinutes: number; routeId: string } | null>(null);
  const [planning, startPlanning] = useTransition();

  const routable = useMemo(() => pending.filter((order) => order.isGeocoded), [pending]);
  const unlocated = useMemo(() => pending.filter((order) => !order.isGeocoded), [pending]);
  const availableCouriers = couriers.filter((courier) => courier.active && !courier.busy);

  /**
   * Seleção com shift para pegar um intervalo.
   *
   * Numa noite cheia o dono despacha 8 pedidos de uma vez. Oito cliques quando
   * um shift-clique resolve é o tipo de atrito que faz a pessoa voltar pro papel.
   */
  function toggle(id: string, shiftKey: boolean) {
    setSelected((current) => {
      const next = new Set(current);

      if (shiftKey && lastAnchor) {
        const from = routable.findIndex((order) => order.id === lastAnchor);
        const to = routable.findIndex((order) => order.id === id);
        if (from !== -1 && to !== -1) {
          const [start, end] = from < to ? [from, to] : [to, from];
          for (let i = start; i <= end; i++) next.add(routable[i].id);
          return next;
        }
      }

      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    setLastAnchor(id);
  }

  function plan() {
    setError(null);
    setResult(null);

    startPlanning(async () => {
      const response = await planRouteAction({ courierId, orderIds: [...selected] });

      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult({ savedMinutes: response.savedMinutes ?? 0, routeId: response.routeId! });
      setSelected(new Set());
      setCourierId('');
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-ink">Precisam de rota</h2>
        {pending.length > 0 ? (
          <span className="numeric rounded-xs bg-raised px-1.5 py-0.5 text-xs text-ink-muted">
            {pending.length}
          </span>
        ) : null}
        <NewOrderDialog
          produtos={produtos}
          trigger={
            <Button size="sm" className="ml-auto">
              <Plus />
              Novo pedido
            </Button>
          }
        />
      </header>

      {/*
        O resultado da otimização aparece aqui, não num toast que some.
        É o número que justifica o produto — o dono precisa poder olhar de novo,
        mostrar pra alguém, e conferir a rota que saiu dele.
      */}
      {result ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-accent-soft px-4 py-3">
          <Sparkles className="size-4 text-accent-ink" aria-hidden />
          <p className="text-sm text-accent-ink">
            {result.savedMinutes > 0 ? (
              <>
                Rota montada. Economia de{' '}
                <strong className="numeric font-semibold">{result.savedMinutes} min</strong> em
                relação à ordem em que os pedidos chegaram.
              </>
            ) : (
              <>Rota montada. A ordem de chegada já era a melhor possível desta vez.</>
            )}
          </p>
          <Button size="sm" variant="outline" asChild className="ml-auto">
            <a href={`/dashboard/rotas/${result.routeId}`}>Acompanhar</a>
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhum pedido esperando"
          description="Quando um pedido entrar — na mão, por webhook ou pelas plataformas — ele aparece aqui para virar rota."
          action={
            <NewOrderDialog
              produtos={produtos}
              trigger={
                <Button size="sm" variant="primary">
                  Lançar o primeiro pedido
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-surface hairline">
          {routable.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              selected={selected.has(order.id)}
              onToggle={toggle}
            />
          ))}

          {/*
            Pedidos sem pino ficam separados e com ação, não escondidos numa
            mensagem de erro: o dono precisa resolvê-los antes de despachar,
            e "resolver" aqui é arrastar o pino no mapa.
          */}
          {unlocated.length > 0 ? (
            <div className="border-t bg-warning-soft/40 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-ink">
                <MapPinOff className="size-3.5 text-warning" aria-hidden />
                {unlocated.length === 1
                  ? '1 pedido sem localização no mapa'
                  : `${unlocated.length} pedidos sem localização no mapa`}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Não entram em rota até o endereço ser localizado no mapa.
              </p>
              <ul className="mt-2 space-y-1.5">
                {unlocated.map((order) => (
                  <li key={order.id} className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-ink">{order.customerName}</span> —{' '}
                      {order.address}
                    </span>
                    <PinPickerDialog
                      order={order}
                      origin={establishment.coordinates}
                      trigger={
                        <Button size="sm" variant="outline" className="shrink-0">
                          <MapPin />
                          Marcar no mapa
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/*
        Barra de ação fixa no rodapé enquanto há seleção.
        Não some com a rolagem: numa lista longa, o dono seleciona lá embaixo e
        o botão precisa estar onde a mão já está.
      */}
      {selected.size > 0 ? (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-lg bg-ink px-4 py-3 text-canvas shadow-lg">
          <span className="text-sm">
            <strong className="numeric font-semibold">{selected.size}</strong>{' '}
            {selected.size === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
          </span>

          <Select
            value={courierId}
            onChange={(event) => setCourierId(event.target.value)}
            aria-label="Motoboy"
            className="ml-auto bg-surface text-ink"
          >
            <option value="">Escolha o motoboy…</option>
            {availableCouriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.name}
              </option>
            ))}
          </Select>

          <Button
            variant="primary"
            onClick={plan}
            disabled={!courierId || planning}
            title={!courierId ? 'Escolha um motoboy primeiro' : undefined}
          >
            {planning ? <LoaderCircle className="animate-spin" /> : <RouteIcon />}
            {planning ? 'Calculando…' : 'Otimizar rota'}
          </Button>

          <Button variant="ghost" onClick={() => setSelected(new Set())} className="text-canvas/70 hover:bg-white/10 hover:text-canvas">
            Limpar
          </Button>
        </div>
      ) : null}

      {availableCouriers.length === 0 && pending.length > 0 ? (
        <p className="text-xs text-ink-muted">
          Nenhum motoboy livre no momento — todos estão em rota ou inativos.
        </p>
      ) : null}
    </section>
  );
}
