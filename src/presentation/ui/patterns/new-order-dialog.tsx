'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { LoaderCircle, X } from 'lucide-react';
import { createOrderAction } from '@/presentation/actions';
import { Button, Field, Input, Textarea } from '../primitives';

export function NewOrderDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, submit] = useTransition();

  /**
   * Sem `useEffect` observando o resultado: a ação já devolve se deu certo,
   * então fechar o diálogo é consequência direta da submissão. Reagir a uma
   * mudança de estado que nós mesmos causamos é dar uma volta que só
   * acrescenta um render a mais e um caminho a mais para dar errado.
   */
  function handleSubmit(formData: FormData) {
    setError(null);

    submit(async () => {
      const result = await createOrderAction(null, formData);

      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-5 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-sm font-semibold text-ink">Novo pedido</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-ink-muted">
                O endereço é localizado no mapa automaticamente.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <form action={handleSubmit} className="flex flex-col gap-3.5">
            <Field label="Cliente">
              <Input name="customerName" required autoFocus placeholder="Nome de quem recebe" />
            </Field>

            <Field
              label="Endereço"
              hint="Rua, número, bairro e cidade — quanto mais completo, melhor o pino."
            >
              <Input name="address" required placeholder="Rua Trajano Reis, 300 - São Francisco, Curitiba" />
            </Field>

            <div className="grid grid-cols-2 gap-3.5">
              <Field label="WhatsApp" hint="Para o link de rastreio">
                <Input name="customerPhone" inputMode="tel" placeholder="(41) 99999-9999" />
              </Field>

              <Field label="Valor">
                <Input name="amountReais" inputMode="decimal" placeholder="0,00" />
              </Field>
            </div>

            <Field label="Referência" hint="Portão, interfone, bloco">
              <Input name="reference" placeholder="Portão azul, interfone 12" />
            </Field>

            <Field label="Observações">
              <Textarea name="notes" rows={2} placeholder="Sem cebola, troco para R$ 100…" />
            </Field>

            {error ? (
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            ) : null}

            <div className="mt-1 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? <LoaderCircle className="animate-spin" /> : null}
                Lançar pedido
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
