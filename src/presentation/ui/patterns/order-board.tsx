'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ChefHat,
  LoaderCircle,
  MapPinOff,
  MessageCircle,
  Package,
  Truck,
} from 'lucide-react';
import { advanceOrderStageAction } from '@/presentation/actions';
import type { OrderView, RouteView } from '@/presentation/queries';
import { Button } from '../primitives';
import { clockTime, currency } from '../format';
import { PinPickerDialog } from './pin-picker-dialog';

/**
 * O dia em colunas, na ordem em que o trabalho acontece.
 *
 * Uma lista só não dizia em que pé cada pedido estava — quem chegou agora,
 * quem está na chapa e quem espera motoboy pareciam a mesma coisa. As colunas
 * separam filas com donos diferentes: "novos" é decisão do dono, "montando" é
 * a cozinha, "prontos" é o despacho.
 *
 * As colunas organizam, não travam: dá para selecionar pedido de qualquer uma
 * delas para montar rota. Exigir a passagem por todas as etapas seria o sistema
 * brigando com quem está no meio da correria.
 */
interface Props {
  novos: OrderView[];
  montando: OrderView[];
  prontos: OrderView[];
  /**
   * As rotas na rua, não os pedidos delas.
   *
   * Um pedido em rota, sozinho, não diz nada acionável: o que o dono quer
   * saber é quem está na rua, quanto já entregou e como falar com ele. E
   * antes isso vivia numa seção abaixo do quadro, que exigia rolar a página
   * inteira num dia movimentado.
   */
  rotas: RouteView[];
  selected: Set<string>;
  onToggle: (id: string, shiftKey: boolean) => void;
  origin: { lat: number; lng: number };
}

export function OrderBoard({
  novos,
  montando,
  prontos,
  rotas,
  selected,
  onToggle,
  origin,
}: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Column
        titulo="Novos"
        icone={Package}
        pedidos={novos}
        vazio="Nada novo agora."
        acao={{ rotulo: 'Aceitar', stage: 'CONFIRMED' }}
        selected={selected}
        onToggle={onToggle}
        origin={origin}
      />
      <Column
        titulo="Montando"
        icone={ChefHat}
        pedidos={montando}
        vazio="Nada na cozinha."
        acao={{ rotulo: 'Pronto', stage: 'READY' }}
        selected={selected}
        onToggle={onToggle}
        origin={origin}
      />
      <Column
        titulo="Prontos"
        icone={Check}
        pedidos={prontos}
        vazio="Nada esperando motoboy."
        destaque
        selected={selected}
        onToggle={onToggle}
        origin={origin}
      />
      <section className="flex min-w-0 flex-col rounded-lg bg-raised/60 p-2.5">
        <header className="mb-2 flex items-center gap-2 px-1">
          <Truck className="size-3.5 text-ink-faint" aria-hidden />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Em rota
          </h3>
          {rotas.length > 0 ? (
            <span className="numeric ml-auto rounded-xs bg-surface px-1.5 text-xs text-ink-muted">
              {rotas.length}
            </span>
          ) : null}
        </header>

        {rotas.length === 0 ? (
          <p className="px-1 py-3 text-xs text-ink-faint">Ninguém na rua.</p>
        ) : (
          <ul className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
            {rotas.map((rota) => (
              <RouteCard key={rota.id} rota={rota} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Uma rota na rua: quem está, quanto já entregou e como falar com ele. */
function RouteCard({ rota }: { rota: RouteView }) {
  const feitas = rota.stops.filter((stop) => stop.status !== 'PENDING').length;
  const progresso = rota.stops.length > 0 ? (feitas / rota.stops.length) * 100 : 0;

  return (
    <li className="rounded-md bg-surface p-2.5 hairline">
      <p className="truncate text-sm font-medium text-ink">{rota.courierName}</p>
      <p className="text-xs text-ink-faint">
        {rota.status === 'PLANNED' ? 'aguardando saída' : 'na rua'} ·{' '}
        <span className="numeric">
          {feitas}/{rota.stops.length}
        </span>{' '}
        entregues
      </p>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-moving" style={{ width: `${progresso}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/rotas/${rota.id}`}>Mapa</Link>
        </Button>

        {rota.courierWhatsappLink ? (
          <Button asChild variant="ghost" size="sm">
            <a href={rota.courierWhatsappLink} target="_blank" rel="noreferrer">
              <MessageCircle />
              WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Column({
  titulo,
  icone: Icone,
  pedidos,
  vazio,
  acao,
  destaque,
  somenteLeitura,
  selected,
  onToggle,
  origin,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  pedidos: OrderView[];
  vazio: string;
  acao?: { rotulo: string; stage: 'CONFIRMED' | 'READY' };
  destaque?: boolean;
  somenteLeitura?: boolean;
  selected: Set<string>;
  onToggle: (id: string, shiftKey: boolean) => void;
  origin: { lat: number; lng: number };
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-lg p-2.5 ${
        destaque ? 'bg-accent-soft/40' : 'bg-raised/60'
      }`}
    >
      <header className="mb-2 flex items-center gap-2 px-1">
        <Icone className="size-3.5 text-ink-faint" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {titulo}
        </h3>
        {pedidos.length > 0 ? (
          <span className="numeric ml-auto rounded-xs bg-surface px-1.5 text-xs text-ink-muted">
            {pedidos.length}
          </span>
        ) : null}
      </header>

      {pedidos.length === 0 ? (
        <p className="px-1 py-3 text-xs text-ink-faint">{vazio}</p>
      ) : (
        /*
         * Cada coluna rola por dentro. Sem isso, catorze pedidos numa coluna
         * empurram o resto da tela para baixo e o dono precisa rolar a página
         * inteira para ver quem está na rua — que é a informação mais urgente
         * justamente no dia movimentado.
         */
        <ul className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
          {pedidos.map((pedido) => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              acao={acao}
              somenteLeitura={somenteLeitura}
              selecionado={selected.has(pedido.id)}
              onToggle={onToggle}
              origin={origin}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderCard({
  pedido,
  acao,
  somenteLeitura,
  selecionado,
  onToggle,
  origin,
}: {
  pedido: OrderView;
  acao?: { rotulo: string; stage: 'CONFIRMED' | 'READY' };
  somenteLeitura?: boolean;
  selecionado: boolean;
  onToggle: (id: string, shiftKey: boolean) => void;
  origin: { lat: number; lng: number };
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  return (
    <li
      /*
       * Enquanto o avanço não volta, o cartão fica apagado e sem clique. A
       * página inteira recarrega depois da ação, e sem esse sinal o dono
       * clica de novo achando que não pegou.
       */
      className={`rounded-md bg-surface p-2.5 transition-opacity hairline ${
        pendente ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {pedido.isGeocoded ? (
          <input
            type="checkbox"
            checked={selecionado}
            onChange={(evento) => onToggle(pedido.id, evento.nativeEvent instanceof MouseEvent && evento.nativeEvent.shiftKey)}
            aria-label={`Selecionar pedido de ${pedido.customerName}`}
            className="mt-0.5 shrink-0"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{pedido.customerName}</p>
          <p className="truncate text-xs text-ink-faint">{pedido.address}</p>
        </div>

        <span className="numeric shrink-0 text-xs text-ink-faint">
          {clockTime(pedido.createdAt)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {pedido.amountCents > 0 ? (
          <span className="numeric text-xs text-ink-muted">{currency(pedido.amountCents)}</span>
        ) : null}

        {/*
          Pedido sem pino não entra em rota, e o conserto é aqui mesmo: a ação
          fica no cartão em vez de num aviso separado que o dono precisa
          procurar.
        */}
        {!pedido.isGeocoded ? (
          <PinPickerDialog
            order={pedido}
            origin={origin}
            trigger={
              <Button size="sm" variant="outline" className="ml-auto">
                <MapPinOff />
                Localizar
              </Button>
            }
          />
        ) : acao ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={pendente}
            onClick={() =>
              startTransition(async () => {
                await advanceOrderStageAction(pedido.id, acao.stage);
                router.refresh();
              })
            }
          >
            {pendente ? <LoaderCircle className="animate-spin" /> : null}
            {acao.rotulo}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
