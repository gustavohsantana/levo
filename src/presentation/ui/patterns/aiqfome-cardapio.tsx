'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import type { CardapioAiqfomeView } from '@/presentation/queries';
import {
  alternarCategoriaAiqfomeAction,
  alternarItemAiqfomeAction,
} from '@/presentation/actions';

/**
 * O cardápio da loja no aiqfome — leitura + disponibilidade.
 *
 * Mostra categorias → itens (preço, tamanhos) e deixa ligar/desligar a
 * disponibilidade de cada item e categoria (toggle `PUT .../toggle-status`,
 * escopo `aqf:menu:create`). Editar nome/preço/complementos vem depois.
 */
export function AiqfomeCardapio({ cardapio }: { cardapio: CardapioAiqfomeView }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [, submit] = useTransition();

  const totalItens = cardapio.categorias.reduce((n, c) => n + c.itens.length, 0);

  function alternar(id: string, acao: () => Promise<{ ok: boolean; error?: string }>) {
    setErro(null);
    setPendenteId(id);
    submit(async () => {
      const r = await acao();
      setPendenteId(null);
      if (r.ok) router.refresh();
      else setErro(r.error ?? 'Falhou.');
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">aiqfome — cardápio</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {cardapio.categorias.length} categorias · {totalItens} itens. Toque no selo para
          ligar/desligar a disponibilidade. O que muda aqui reflete no aiqfome.
        </p>
      </div>

      {erro ? <p className="text-sm text-danger">{erro}</p> : null}

      {cardapio.categorias.length === 0 ? (
        <p className="rounded-lg bg-surface p-4 text-sm text-ink-faint hairline">
          Nenhuma categoria no cardápio.
        </p>
      ) : null}

      {cardapio.categorias.map((cat) => (
        <section key={cat.id} className="rounded-lg bg-surface p-4 hairline">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">{cat.name}</h2>
            <ToggleDisponibilidade
              status={cat.status}
              pendente={pendenteId === `cat:${cat.id}`}
              onClick={() =>
                alternar(`cat:${cat.id}`, () => alternarCategoriaAiqfomeAction(cat.id))
              }
            />
          </div>

          <ul className="mt-3 flex flex-col divide-y">
            {cat.itens.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{it.name}</p>
                  {it.descricao ? (
                    <p className="truncate text-xs text-ink-faint">{it.descricao}</p>
                  ) : null}
                  {it.tamanhos.length > 1 ? (
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {it.tamanhos.map((t) => t.nome).join(' · ')}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm tabular-nums text-ink">{it.precoLabel}</span>
                  <ToggleDisponibilidade
                    status={it.status}
                    pendente={pendenteId === `item:${it.id}`}
                    onClick={() =>
                      alternar(`item:${it.id}`, () => alternarItemAiqfomeAction(it.id))
                    }
                  />
                </div>
              </li>
            ))}
            {cat.itens.length === 0 ? (
              <li className="py-2 text-sm text-ink-faint">Sem itens.</li>
            ) : null}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Selo clicável: verde = disponível, vermelho = indisponível. Alterna ao clicar. */
function ToggleDisponibilidade({
  status,
  pendente,
  onClick,
}: {
  status: string;
  pendente: boolean;
  onClick: () => void;
}) {
  const ok = status === 'AVAILABLE';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendente}
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition disabled:opacity-50 ${
        ok
          ? 'bg-accent-soft text-accent-ink hover:bg-accent-soft/70'
          : 'bg-danger-soft text-danger hover:bg-danger-soft/70'
      }`}
      title={ok ? 'Disponível — clique para desativar' : 'Indisponível — clique para ativar'}
    >
      {pendente ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : null}
      {ok ? 'Disponível' : 'Indisponível'}
    </button>
  );
}
