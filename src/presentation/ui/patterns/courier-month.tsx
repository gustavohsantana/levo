'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Route as RouteIcon } from 'lucide-react';
import type { CourierDay, CourierRouteView } from '@/presentation/queries';
import { Button } from '../primitives';
import { clockTime, distance, minutes } from '../format';

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
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

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

      <Calendario
        mes={mes}
        porDia={porDia}
        selecionado={diaSelecionado}
        onSelect={setDiaSelecionado}
      />

      {diaSelecionado ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            {diaPorExtenso(diaSelecionado)}
          </h2>

          {rotasDoDia.length === 0 ? (
            <p className="text-sm text-ink-faint">Nenhuma rota neste dia.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg bg-surface hairline">
              {rotasDoDia.map((rota) => (
                <li key={rota.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                  <RouteIcon className="size-4 shrink-0 text-ink-faint" aria-hidden />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      {rota.deliveries} de {rota.stops}{' '}
                      {rota.stops === 1 ? 'entrega' : 'entregas'}
                      {rota.failed > 0 ? (
                        <span className="text-danger"> · {rota.failed} sem sucesso</span>
                      ) : null}
                    </p>
                    <p className="numeric text-xs text-ink-faint">
                      {clockTime(rota.createdAt)} · {distance(rota.distanceMeters)} ·{' '}
                      {minutes(rota.durationSeconds)}
                    </p>
                  </div>

                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/rotas/${rota.id}`}>Ver rota</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="text-sm text-ink-faint">
          Clique num dia com movimento para ver as rotas dele.
        </p>
      )}
    </div>
  );
}

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
    <div className="rounded-lg bg-surface p-3 hairline">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS.map((dia, i) => (
          <span key={i} className="py-1 text-center text-xs text-ink-faint">
            {dia}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-sm transition ${
                ativo
                  ? 'bg-ink text-canvas'
                  : dia
                    ? 'bg-accent-soft text-accent-ink hover:brightness-95'
                    : 'text-ink-faint'
              }`}
            >
              <span className="numeric">{numero}</span>
              {dia ? (
                <span className="numeric text-[10px] opacity-80">{dia.deliveries}</span>
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
