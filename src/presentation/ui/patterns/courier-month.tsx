'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CourierDay, CourierRouteView } from '@/presentation/queries';
import { Button } from '../primitives';
import { clockTime, currency, distance, minutes } from '../format';

/**
 * O mês de trabalho de um entregador.
 *
 * Existe para o acerto. Como cada delivery paga de um jeito — por entrega, por
 * dia, por rota —, a tela mostra os três em vez de escolher um: o dono usa o
 * número que o combinado dele pede.
 *
 * A distância é sempre **por rota**, nunca por parada. Guardamos a distância do
 * trajeto inteiro, e reparti-la entre as entregas seria estimativa vendida como
 * fato — justamente num número que vira dinheiro.
 */
interface Props {
  courier: { id: string; name: string; phone: string; active: boolean };
  mes: string;
  days: CourierDay[];
  routes: CourierRouteView[];
}

export function CourierMonth({ courier, mes, days, routes }: Props) {
  /*
   * Abre no dia mais recente com movimento em vez de vazio. Quem entra aqui
   * quer ver o último trabalho — pedir um clique antes de mostrar qualquer
   * coisa desperdiça a tela e o tempo de quem chegou.
   */
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(
    days.length > 0 ? days[days.length - 1].date : null,
  );

  const porDia = new Map(days.map((dia) => [dia.date, dia]));
  const total = days.reduce(
    (acc, dia) => ({
      routes: acc.routes + dia.routes,
      deliveries: acc.deliveries + dia.deliveries,
      distanceMeters: acc.distanceMeters + dia.distanceMeters,
    }),
    { routes: 0, deliveries: 0, distanceMeters: 0 },
  );

  const rotasDoDia = diaSelecionado
    ? routes.filter((rota) => diaLocal(rota.createdAt) === diaSelecionado)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/entregadores" className="text-sm text-ink-muted hover:underline">
          ← Entregadores
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">{courier.name}</h1>
        <p className="numeric mt-0.5 text-sm text-ink-muted">{courier.phone}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`?mes=${vizinho(mes, -1)}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <span className="text-sm font-medium text-ink">{rotuloMes(mes)}</span>
        <Button asChild variant="ghost" size="sm">
          <Link href={`?mes=${vizinho(mes, 1)}`}>
            <ChevronRight />
          </Link>
        </Button>

        <dl className="ml-auto flex flex-wrap gap-5 text-sm">
          <Total rotulo="entregas" valor={String(total.deliveries)} />
          <Total rotulo="rotas" valor={String(total.routes)} />
          <Total rotulo="rodados" valor={distance(total.distanceMeters)} />
        </dl>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
        <Calendario
          mes={mes}
          porDia={porDia}
          selecionado={diaSelecionado}
          onSelect={setDiaSelecionado}
        />

        {diaSelecionado ? (
        <section className="min-w-0">
          <h2 className="mb-2 text-sm font-semibold text-ink">
            {diaPorExtenso(diaSelecionado)}
            {porDia.get(diaSelecionado) ? (
              <span className="ml-2 font-normal text-ink-faint">
                {porDia.get(diaSelecionado)!.deliveries} entregues ·{' '}
                {distance(porDia.get(diaSelecionado)!.distanceMeters)}
              </span>
            ) : null}
          </h2>

          {rotasDoDia.length === 0 ? (
            <p className="text-sm text-ink-faint">Nenhuma rota neste dia.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg bg-surface hairline">
              {rotasDoDia.map((rota, indice) => (
                // A primeira já vem aberta: com uma rota só no dia, que é o caso
                // comum, o acordeão fechado seria um clique para ver a única coisa
                // que existe ali.
                <RouteAccordion key={rota.id} rota={rota} inicialmenteAberta={indice === 0} />
              ))}
            </ul>
          )}
        </section>
        ) : (
          <p className="text-sm text-ink-faint">
            Nenhuma rota neste mês.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Uma rota que abre no lugar.
 *
 * O resumo responde "quanto rendeu"; as paradas respondem "o que aconteceu".
 * Levar a segunda pergunta para outra tela obriga o dono a perder o dia em que
 * estava, e ele volta para conferir a rota seguinte — por isso abre aqui.
 */
function RouteAccordion({
  rota,
  inicialmenteAberta,
}: {
  rota: CourierRouteView;
  inicialmenteAberta?: boolean;
}) {
  const [aberta, setAberta] = useState(Boolean(inicialmenteAberta));

  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setAberta((atual) => !atual)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised/50"
      >
        <ChevronDown
          className={`size-4 shrink-0 text-ink-faint transition-transform ${
            aberta ? 'rotate-180' : ''
          }`}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">
            {rota.deliveries} de {rota.stops} {rota.stops === 1 ? 'entrega' : 'entregas'}
            {rota.failed > 0 ? (
              <span className="text-danger"> · {rota.failed} sem sucesso</span>
            ) : null}
          </p>
          <p className="numeric text-xs text-ink-faint">
            {clockTime(rota.createdAt)} · {distance(rota.distanceMeters)} ·{' '}
            {minutes(rota.durationSeconds)}
          </p>
        </div>
      </button>

      {aberta ? (
        <div className="border-t bg-raised/40 px-4 py-3">
          <ol className="flex flex-col gap-2">
            {rota.paradas.map((parada) => (
              <li key={parada.position} className="flex items-center gap-3 text-sm">
                <span className="numeric w-5 shrink-0 text-xs text-ink-faint">
                  {parada.position}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{parada.customerName}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {parada.address}
                    {parada.legDistanceMeters > 0 ? (
                      <span className="numeric"> · {distance(parada.legDistanceMeters)}</span>
                    ) : null}
                  </p>
                </div>

                {parada.amountCents > 0 ? (
                  <span className="numeric shrink-0 text-xs text-ink-muted">
                    {currency(parada.amountCents)}
                  </span>
                ) : null}

                <span
                  className={`shrink-0 text-xs ${
                    parada.status === 'DELIVERED'
                      ? 'text-ink-faint'
                      : parada.status === 'FAILED'
                        ? 'text-danger'
                        : 'text-warning'
                  }`}
                >
                  {ROTULO_PARADA[parada.status]}
                </span>
              </li>
            ))}
          </ol>

          <Button asChild variant="ghost" size="sm" className="mt-2">
            <Link href={`/dashboard/rotas/${rota.id}`}>Ver no mapa</Link>
          </Button>
        </div>
      ) : null}
    </li>
  );
}

const ROTULO_PARADA = {
  DELIVERED: 'entregue',
  FAILED: 'sem sucesso',
  PENDING: 'pendente',
} as const;

function Total({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dd className="numeric font-semibold text-ink">{valor}</dd>
      <dt className="text-xs text-ink-faint">{rotulo}</dt>
    </div>
  );
}

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Calendario({
  mes,
  porDia,
  selecionado,
  onSelect,
}: {
  mes: string;
  porDia: Map<string, CourierDay>;
  selecionado: string | null;
  onSelect: (dia: string | null) => void;
}) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  const primeiro = new Date(Date.UTC(ano, mesNumero - 1, 1));
  const diasNoMes = new Date(Date.UTC(ano, mesNumero, 0)).getUTCDate();

  // Casas vazias antes do dia 1, para a semana começar no lugar certo.
  const offset = primeiro.getUTCDay();

  return (
    <div className="rounded-lg bg-surface p-2.5 hairline">
      <div className="mb-0.5 grid grid-cols-7 gap-0.5">
        {DIAS.map((dia, i) => (
          <span key={i} className="text-center text-[11px] text-ink-faint">
            {dia}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: offset }, (_, i) => <span key={`vazio-${i}`} />)}

        {Array.from({ length: diasNoMes }, (_, i) => {
          const numero = i + 1;
          const data = `${mes}-${String(numero).padStart(2, '0')}`;
          const dia = porDia.get(data);
          const ativo = selecionado === data;

          return (
            <button
              key={data}
              type="button"
              disabled={!dia}
              onClick={() => onSelect(ativo ? null : data)}
              className={`flex h-8 flex-col items-center justify-center rounded text-xs leading-none transition ${
                ativo
                  ? 'bg-ink text-canvas'
                  : dia
                    ? 'bg-accent-soft text-accent-ink hover:brightness-95'
                    : 'text-ink-faint'
              }`}
            >
              <span className="numeric">{numero}</span>
              {dia ? (
                <span className="numeric text-[9px] opacity-80">{dia.deliveries}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Mesma conversão da consulta: o dia é o do lojista, não o do servidor. */
function diaLocal(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function vizinho(mes: string, delta: number): string {
  const [ano, numero] = mes.split('-').map(Number);
  const data = new Date(Date.UTC(ano, numero - 1 + delta, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

function rotuloMes(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(ano, numero - 1, 1)));
}

function diaPorExtenso(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(ano, mes - 1, dia)));
}
