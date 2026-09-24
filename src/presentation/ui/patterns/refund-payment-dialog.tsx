'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CircleCheck, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/presentation/ui/primitives/button';
import { estornarPagamentoAction } from '@/presentation/actions';
import { currency } from '../format';

/**
 * Devolver o dinheiro do cliente, do painel.
 *
 * Diálogo, e não botão solto, pelo mesmo motivo do cancelamento: é dinheiro
 * saindo da conta da loja e não tem desfazer. A diferença é que aqui o desfecho
 * importa mais que a confirmação — quem clica precisa saber, sem ambiguidade, se
 * o Mercado Pago aceitou. Por isso o diálogo **não fecha sozinho** no sucesso:
 * ele mostra quanto voltou, e o dono é quem encerra depois de ler.
 */
export function RefundPaymentDialog({
  orderId,
  customerName,
  amountCents,
  trigger,
}: {
  orderId: string;
  customerName: string;
  amountCents: number;
  trigger: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ amountCents: number; emAndamento: boolean } | null>(null);
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

  function abrir(estaAberto: boolean) {
    setAberto(estaAberto);
    if (estaAberto) {
      setErro(null);
      setFeito(null);
      return;
    }

    /*
     * O painel só recarrega ao fechar, e só se algo mudou: o pedido sai da fila
     * na hora em que a lista é relida, e fazer isso com o resultado na tela
     * apagaria a confirmação que a pessoa ainda está lendo.
     */
    if (feito) router.refresh();
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={abrir}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-ink">
                Estornar pagamento
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-ink-muted">
                {customerName} · não tem como desfazer
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {feito ? (
              <div className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {feito.emAndamento
                      ? `Estorno de ${currency(feito.amountCents)} aceito pelo Mercado Pago.`
                      : `${currency(feito.amountCents)} devolvidos ao cliente.`}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {feito.emAndamento
                      ? 'O valor está sendo devolvido e deve aparecer na conta do cliente em '
                        + 'alguns minutos.'
                      : 'O pedido saiu da fila e está marcado como estornado.'}
                  </p>
                </div>
              </div>
            ) : erro ? (
              <div className="flex items-start gap-2.5 rounded-sm bg-danger-soft px-3 py-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                <div>
                  <p className="text-sm text-danger">{erro}</p>
                  {/*
                    Dito sem rodeio: uma falha de estorno é lida às pressas, e a
                    única pergunta que a pessoa tem é se pode contar ao cliente
                    que o dinheiro voltou.
                  */}
                  <p className="mt-1 text-xs text-ink-muted">
                    O dinheiro não voltou. O pedido continua como estava.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink">
                  Devolver{' '}
                  <span className="numeric font-semibold">{currency(amountCents)}</span> para quem
                  pagou, pela conta do Mercado Pago da loja.
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  O pedido sai da fila da cozinha e da rota, e fica registrado como estornado.
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                {feito ? 'Fechar' : 'Voltar'}
              </Button>
            </Dialog.Close>

            {feito ? null : (
              <Button
                size="sm"
                variant="danger"
                disabled={pendente}
                onClick={() =>
                  startTransition(async () => {
                    setErro(null);
                    const r = await estornarPagamentoAction(orderId);
                    if (!r.ok) {
                      setErro(r.error ?? 'Não foi possível estornar.');
                      return;
                    }
                    setFeito({ amountCents: r.amountCents, emAndamento: r.emAndamento });
                  })
                }
              >
                {pendente ? <LoaderCircle className="animate-spin" /> : null}
                Estornar {currency(amountCents)}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
