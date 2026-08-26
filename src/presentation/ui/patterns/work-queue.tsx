'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChefHat,
  Inbox,
  LoaderCircle,
  MapPin,
  MapPinOff,
  Plus,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react';
import { advanceOrderStageAction, planRouteAction } from '@/presentation/actions';
import type { OrderView, RouteView } from '@/presentation/queries';
import { Button, EmptyState, Select } from '../primitives';
import { OrderBoard } from './order-board';
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
  rotasAtivas = [],
  couriers,
  establishment,
  produtos = [],
}: {
  pending: OrderView[];
  /** As rotas na rua, para a quarta coluna. */
  rotasAtivas?: RouteView[];
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
  const [avancando, startAdvance] = useTransition();
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

  /*
   * Os selecionados que ainda podem avançar. O botão só aparece quando há
   * alguém para mover: oferecer "Aceitar" com tudo já aceito é um botão que
   * não faz nada, e botão que não faz nada ensina a ignorar botões.
   */
  const selecionados = pending.filter((order) => selected.has(order.id));
  const paraAceitar = selecionados.filter((order) => order.stage === 'NOVO');
  const paraProntos = selecionados.filter((order) => order.stage !== 'PRONTO');

  function avancarSelecionados(stage: 'CONFIRMED' | 'READY') {
    const alvos = stage === 'CONFIRMED' ? paraAceitar : paraProntos;

    startAdvance(async () => {
      /*
       * Em série, não em paralelo: cada um abre uma transação e, quando o
       * pedido é de marketplace, enfileira um aviso. Disparar dez de uma vez
       * economizaria talvez um segundo e traria disputa por conexão no
       * momento de maior movimento.
       */
      for (const order of alvos) {
        await advanceOrderStageAction(order.id, stage);
      }

      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-ink">Pedidos de hoje</h2>
        {pending.length > 0 ? (
          <span className="numeric rounded-xs bg-raised px-1.5 py-0.5 text-xs text-ink-muted">
            {pending.length}
          </span>
        ) : null}
        {/*
          A dica só aparece com a seleção vazia. Quem já selecionou está vendo
          a barra de ação, e repetir a instrução ali seria ruído.
        */}
        {selected.size === 0 && pending.length > 0 ? (
          <span className="hidden text-xs text-ink-faint sm:inline">
            selecione para avançar etapa ou montar rota
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

      {pending.length === 0 && rotasAtivas.length === 0 ? (
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
        <OrderBoard
          novos={pending.filter((o) => o.stage === 'NOVO')}
          montando={pending.filter((o) => o.stage === 'MONTANDO')}
          prontos={pending.filter((o) => o.stage === 'PRONTO')}
          rotas={rotasAtivas}
          selected={selected}
          onToggle={toggle}
          origin={establishment.coordinates}
        />
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

          {paraAceitar.length > 0 ? (
            <Button
              variant="outline"
              disabled={avancando}
              onClick={() => avancarSelecionados('CONFIRMED')}
              className="border-white/25 bg-transparent text-canvas hover:bg-white/10"
            >
              {avancando ? <LoaderCircle className="animate-spin" /> : <Check />}
              Aceitar {paraAceitar.length}
            </Button>
          ) : null}

          {paraProntos.length > 0 ? (
            <Button
              variant="outline"
              disabled={avancando}
              onClick={() => avancarSelecionados('READY')}
              className="border-white/25 bg-transparent text-canvas hover:bg-white/10"
            >
              {avancando ? <LoaderCircle className="animate-spin" /> : <ChefHat />}
              Marcar pronto {paraProntos.length}
            </Button>
          ) : null}

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
