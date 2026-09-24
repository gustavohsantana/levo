'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Package, TrendingUp } from 'lucide-react';
import type { HistoricoDoDia } from '@/presentation/courier-history-core';
import { cn } from '../cn';
import { currency } from '../format';

/**
 * A aba de histórico do motoboy.
 *
 * Responde a pergunta do fim do turno — "quanto eu fiz hoje?" — e a do fim da
 * semana — "e quinta passada?". Mesmo contexto do resto do app dele: tema
 * escuro, uma mão, número grande. O calendário é o `input[type=date]` nativo,
 * que no celular abre o seletor do próprio sistema e é o que ele já sabe usar.
 */
export function CourierHistoryScreen({
  nome,
  dia,
  hoje,
  resumo,
  recentes,
}: {
  nome: string;
  /** Dia selecionado (`YYYY-MM-DD`). */
  dia: string;
  /** Hoje em Brasília, para travar o calendário no futuro. */
  hoje: string;
  resumo: HistoricoDoDia;
  recentes: HistoricoDoDia[];
}) {
  const router = useRouter();

  function irPara(novoDia: string) {
    if (!novoDia) return;
    router.push(`/entregador/historico?dia=${novoDia}`);
  }

  return (
    <div data-theme="dark" className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <a
          href="/entregador"
          aria-label="Voltar"
          className="-ml-2 grid size-10 shrink-0 place-items-center rounded-md text-ink-muted active:bg-raised"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </a>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">Histórico de corridas</p>
          <p className="truncate text-xs text-ink-muted">{nome}</p>
        </div>
      </header>

      <section className="space-y-4 px-4 py-5">
        {/* O total do dia — a resposta que ele abre a tela para ver. */}
        <div className="rounded-xl bg-raised p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {formatarDiaLongo(dia, hoje)}
            </p>
            <label className="relative inline-flex items-center gap-1.5 text-xs text-accent">
              <CalendarDays className="size-3.5" aria-hidden />
              Trocar dia
              {/*
                O input cobre o rótulo (opacidade zero, mas clicável): assim o
                toque em qualquer lugar do "Trocar dia" abre o calendário do
                sistema, sem depender de acertar um campo pequeno de luva.
              */}
              <input
                type="date"
                value={dia}
                max={hoje}
                onChange={(event) => irPara(event.target.value)}
                aria-label="Escolher outro dia"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="numeric text-3xl font-semibold leading-none text-ink">
                {resumo.entregas}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {resumo.entregas === 1 ? 'entrega' : 'entregas'}
              </p>
            </div>
            <div>
              {resumo.semAcordo ? (
                <>
                  <p className="text-lg font-semibold leading-tight text-ink-muted">—</p>
                  <p className="mt-1 text-xs text-ink-faint">acerto a combinar com a loja</p>
                </>
              ) : (
                <>
                  <p className="numeric text-3xl font-semibold leading-none text-accent">
                    {currency(resumo.ganhoCents)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">a receber no dia</p>
                </>
              )}
            </div>
          </div>

          {resumo.metrosTotais > 0 ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
              <TrendingUp className="size-3.5" aria-hidden />
              <span className="numeric">{(resumo.metrosTotais / 1000).toFixed(1)}</span> km rodados
            </p>
          ) : null}
        </div>

        {/* As entregas daquele dia. */}
        {resumo.itens.length > 0 ? (
          <ol className="space-y-1">
            {resumo.itens.map((item, index) => (
              <li
                key={`${item.quando}-${index}`}
                className="flex items-start gap-3 rounded-md px-1 py-2"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-raised text-ink-muted">
                  <Package className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.cliente}</p>
                  <p className="truncate text-xs text-ink-muted">{item.endereco}</p>
                </div>
                <span className="numeric shrink-0 text-xs text-ink-faint">{horaDe(item.quando)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-md bg-raised px-3 py-6 text-center text-sm text-ink-muted">
            Nenhuma entrega neste dia.
          </p>
        )}
      </section>

      {/* Os últimos dias rodados — tocar troca o dia mostrado acima. */}
      {recentes.length > 0 ? (
        <section className="border-t px-4 py-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Últimos dias
          </h2>
          <ol className="space-y-1">
            {recentes.map((historico) => {
              const selecionado = historico.dia === dia;
              return (
                <li key={historico.dia}>
                  <button
                    type="button"
                    onClick={() => irPara(historico.dia)}
                    className={cn(
                      '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2.5 text-left transition active:bg-raised',
                      selecionado && 'bg-raised',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{formatarDiaCurto(historico.dia)}</p>
                      <p className="text-xs text-ink-muted">
                        <span className="numeric">{historico.entregas}</span>{' '}
                        {historico.entregas === 1 ? 'entrega' : 'entregas'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'numeric shrink-0 text-sm font-medium',
                        historico.semAcordo ? 'text-ink-faint' : 'text-accent',
                      )}
                    >
                      {historico.semAcordo ? '—' : currency(historico.ganhoCents)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

/** `2026-09-22` no fuso local do texto, sem escorregar um dia por causa de UTC. */
function dataDoDia(dia: string): Date {
  return new Date(`${dia}T12:00:00`);
}

function formatarDiaLongo(dia: string, hoje: string): string {
  if (dia === hoje) return 'Hoje';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(dataDoDia(dia));
}

function formatarDiaCurto(dia: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(dataDoDia(dia));
}

function horaDe(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}
