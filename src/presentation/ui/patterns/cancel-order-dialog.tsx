'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/presentation/ui/primitives/button';
import { cancelOrderAction, cancellationReasonsAction } from '@/presentation/actions';

interface Motivo {
  code: string;
  description: string;
}

/**
 * Motivo usado quando a plataforma não oferece lista.
 *
 * O ambiente de testes do iFood responde 204 em `cancellationReasons`, e sem
 * uma opção o lojista ficaria olhando um diálogo vazio sem saber o que fazer.
 * `501` é o código genérico de problema no sistema do restaurante — o mais
 * neutro dos padrões, e o próprio iFood aceita.
 */
const PADRAO: Motivo = { code: '501', description: 'PROBLEMAS DE SISTEMA' };

/**
 * Cancelar é a única ação do painel que não tem volta: o pedido morre na
 * plataforma, o cliente é avisado e, dependendo do motivo, o lojista leva
 * multa. Por isso é diálogo com escolha explícita de motivo, e não um botão
 * solto no cartão.
 */
export function CancelOrderDialog({
  orderId,
  customerName,
  trigger,
}: {
  orderId: string;
  customerName: string;
  trigger: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivos, setMotivos] = useState<Motivo[] | null>(null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

  /*
   * Os motivos são buscados ao abrir, nunca antes: a lista depende do estado
   * atual do pedido, e uma guardada de minutos atrás pode já ter mudado.
   */
  function abrir(estaAberto: boolean) {
    setAberto(estaAberto);
    if (!estaAberto) return;

    setErro(null);
    setMotivos(null);
    startTransition(async () => {
      const resposta = await cancellationReasonsAction(orderId);
      if (!resposta.ok) {
        setErro(resposta.error ?? 'Não foi possível consultar os motivos.');
        setMotivos([PADRAO]);
        setEscolhido(PADRAO.code);
        return;
      }
      const lista = resposta.reasons.length > 0 ? resposta.reasons : [PADRAO];
      setMotivos(lista);
      setEscolhido(lista[0].code);
    });
  }

  const motivo = motivos?.find((m) => m.code === escolhido) ?? null;

  return (
    <Dialog.Root open={aberto} onOpenChange={abrir}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-ink">
                Cancelar pedido
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
            {erro ? (
              <p className="mb-3 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>
            ) : null}

            {motivos === null ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Consultando os motivos aceitos…
              </p>
            ) : (
              <fieldset>
                <legend className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Motivo
                </legend>
                <div className="mt-2 flex flex-col gap-1">
                  {motivos.map((m) => (
                    <label
                      key={m.code}
                      className="flex cursor-pointer items-start gap-2.5 rounded-sm px-2 py-1.5 text-sm text-ink hover:bg-raised"
                    >
                      <input
                        type="radio"
                        name="motivo-cancelamento"
                        value={m.code}
                        checked={escolhido === m.code}
                        onChange={() => setEscolhido(m.code)}
                        className="mt-0.5"
                      />
                      <span>{m.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Voltar
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              variant="danger"
              disabled={pendente || !motivo}
              onClick={() =>
                startTransition(async () => {
                  if (!motivo) return;
                  setErro(null);
                  const r = await cancelOrderAction(orderId, motivo.description, motivo.code);
                  if (!r.ok) {
                    setErro(r.error ?? 'Não foi possível cancelar.');
                    return;
                  }
                  setAberto(false);
                  router.refresh();
                })
              }
            >
              {pendente ? <LoaderCircle className="animate-spin" /> : null}
              Cancelar pedido
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
