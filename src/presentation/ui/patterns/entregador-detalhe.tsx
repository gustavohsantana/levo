'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { LoaderCircle, X } from 'lucide-react';
import { entregasDoEntregadorAction } from '@/presentation/actions';
import type { EntregaDoEntregador } from '@/presentation/reports';
import { clockTime, currency } from '../format';

/**
 * Uma linha de "Por entregador" que abre o detalhe das entregas dele.
 *
 * O relatório resume — "8 entregas · R$ 64" — e quem clica quer ver quais
 * foram: a que horas, para quem, quão longe. A lista vem sob demanda, só quando
 * o modal abre, porque ninguém abre o detalhe de todos os motoboys de uma vez.
 */
export function EntregadorDetalhe({
  id,
  nome,
  entregas,
  tempoMedioMinutos,
  aPagarCents,
  semAcordo,
  de,
  ate,
}: {
  id: string;
  nome: string;
  entregas: number;
  tempoMedioMinutos: number | null;
  aPagarCents: number;
  semAcordo: boolean;
  de: string;
  ate: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [lista, setLista] = useState<EntregaDoEntregador[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir(v: boolean) {
    setAberto(v);
    // Busca uma vez, na primeira abertura. Reabrir não repete a consulta.
    if (v && lista === null && !carregando) {
      setCarregando(true);
      setErro(null);
      const r = await entregasDoEntregadorAction(id, de, ate);
      setCarregando(false);
      if (r.ok) setLista(r.entregas);
      else setErro(r.error);
    }
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={abrir}>
      <li className="flex items-baseline justify-between gap-3">
        <Dialog.Trigger asChild>
          <button type="button" className="min-w-0 truncate text-left text-ink hover:underline">
            {nome}
            <span className="ml-2 text-xs text-ink-faint">
              {entregas} {entregas === 1 ? 'entrega' : 'entregas'}
              {tempoMedioMinutos !== null ? ` · ${tempoMedioMinutos} min` : ''}
            </span>
          </button>
        </Dialog.Trigger>

        {/*
          Acordo em branco mostra o aviso, não R$ 0,00: zero pareceria uma
          conta fechada, e o dono só descobriria o buraco no dia do acerto.
        */}
        {semAcordo ? (
          <Link
            href={`/dashboard/entregadores/${id}`}
            className="shrink-0 text-xs text-ink-muted underline underline-offset-2"
          >
            definir acordo
          </Link>
        ) : (
          <span className="numeric shrink-0 text-ink">{currency(aPagarCents)}</span>
        )}
      </li>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-sm font-semibold text-ink">
                {nome}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-ink-muted">
                {entregas} {entregas === 1 ? 'entrega' : 'entregas'} no período
                {semAcordo ? '' : ` · a pagar ${currency(aPagarCents)}`}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-raised hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {carregando ? (
              <p className="flex items-center gap-2 py-6 text-sm text-ink-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Carregando as entregas…
              </p>
            ) : erro ? (
              <p className="py-6 text-sm text-danger">{erro}</p>
            ) : lista && lista.length > 0 ? (
              <ul className="flex flex-col divide-y">
                {lista.map((entrega, i) => (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <span className="numeric shrink-0 text-xs text-ink-faint" suppressHydrationWarning>
                      {clockTime(entrega.quando)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{entrega.cliente}</p>
                      <p className="truncate text-xs text-ink-faint">{entrega.endereco}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="numeric text-sm text-ink">{currency(entrega.totalCents)}</p>
                      <p className="text-xs text-ink-faint">
                        {formatarDistancia(entrega.metros)}
                        {entrega.minutos !== null ? ` · ${entrega.minutos} min` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-sm text-ink-faint">Nenhuma entrega concluída no período.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 1240 → "1,2 km"; 800 → "800 m"; sem distância → vazio. */
function formatarDistancia(metros: number | null): string {
  if (metros === null || metros <= 0) return '';
  if (metros >= 1000) return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
  return `${metros} m`;
}
