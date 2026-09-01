'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/presentation/ui/primitives/button';
import { concluirEntregasAction } from '@/presentation/actions';
import type { RouteView } from '@/presentation/queries';

/**
 * Fecha as entregas de um motoboy pelo painel.
 *
 * Existe porque nem toda entrega é confirmada por ele: esquece, o celular
 * descarrega, ou ele simplesmente não usa a tela. Sem isto, o dono termina o
 * dia com rota aberta e precisa ligar para cada um para fechar.
 *
 * O que fica DE FORA é tão importante quanto o que entra: parada não marcada
 * continua pendente, e não vira "não entregue". Marcar como falha é decisão
 * com consequência — o cliente não recebeu — e não pode acontecer por
 * distração de quem só queria fechar as outras.
 */
export function ConcludeDeliveriesDialog({
  rota,
  trigger,
}: {
  rota: RouteView;
  trigger: React.ReactNode;
}) {
  const pendentes = rota.stops.filter((stop) => stop.status === 'PENDING');
  const [aberto, setAberto] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

  const todas = pendentes.length > 0 && marcadas.size === pendentes.length;

  function abrir(estaAberto: boolean) {
    setAberto(estaAberto);
    if (estaAberto) {
      setErro(null);
      // Nada pré-marcado: confirmar entrega é afirmar que a comida chegou.
      setMarcadas(new Set());
    }
  }

  function alternar(id: string) {
    setMarcadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={abrir}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-ink">
                Concluir entregas
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-ink-muted">
                {rota.courierName} · {pendentes.length}{' '}
                {pendentes.length === 1 ? 'parada pendente' : 'paradas pendentes'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {erro ? (
              <p className="mb-3 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>
            ) : null}

            {pendentes.length === 0 ? (
              <p className="text-sm text-ink-muted">Nada pendente nesta rota.</p>
            ) : (
              <>
                {/*
                  O atalho fica no topo, junto do que ele controla. Embaixo da
                  lista, numa rota de quinze paradas, ele some da tela.
                */}
                <label className="flex cursor-pointer items-center gap-2.5 border-b pb-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={todas}
                    onChange={() =>
                      setMarcadas(todas ? new Set() : new Set(pendentes.map((s) => s.id)))
                    }
                  />
                  Selecionar todas
                </label>

                <ul className="mt-1">
                  {pendentes.map((stop) => (
                    <li key={stop.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-sm px-1 py-2 hover:bg-raised">
                        <input
                          type="checkbox"
                          checked={marcadas.has(stop.id)}
                          onChange={() => alternar(stop.id)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">
                            {stop.customerName}
                          </span>
                          <span className="block truncate text-xs text-ink-faint">
                            {stop.address}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                  O que ficar sem marcar continua pendente — não vira não entregue.
                </p>
              </>
            )}
          </div>

          {pendentes.length > 0 ? (
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Voltar
                </Button>
              </Dialog.Close>
              <Button
                size="sm"
                variant="primary"
                disabled={pendente || marcadas.size === 0}
                onClick={() =>
                  startTransition(async () => {
                    setErro(null);
                    const r = await concluirEntregasAction(rota.id, [...marcadas]);
                    if (!r.ok) {
                      setErro(r.error ?? 'Não foi possível concluir.');
                      return;
                    }
                    setAberto(false);
                    router.refresh();
                  })
                }
              >
                {pendente ? <LoaderCircle className="animate-spin" /> : null}
                {marcadas.size === 0
                  ? 'Concluir'
                  : `Concluir ${marcadas.size} ${marcadas.size === 1 ? 'entrega' : 'entregas'}`}
              </Button>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
