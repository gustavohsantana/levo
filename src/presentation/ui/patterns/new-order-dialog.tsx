'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { LoaderCircle, X } from 'lucide-react';
import { createOrderAction } from '@/presentation/actions';
import type { OptionGroupView, ProductView } from '@/presentation/queries';
import type { Faixa } from './delivery-fee-bands';
import { OrderItemsPicker, type ItemEscolhido } from './order-items-picker';
import { Button, Field, Input, Select, Textarea } from '../primitives';

export function NewOrderDialog({
  trigger,
  produtos = [],
  grupos = [],
  taxaPadraoReais = 0,
  faixas = [],
}: {
  trigger: React.ReactNode;
  produtos?: ProductView[];
  /** Os grupos de opção, para montar o produto que pede tamanho/adicionais. */
  grupos?: OptionGroupView[];
  faixas?: Faixa[];
  /** Vem das Configurações. O dono muda no pedido quando for diferente. */
  taxaPadraoReais?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, submit] = useTransition();
  const [itens, setItens] = useState<ItemEscolhido[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  /*
   * Vazio significa automático: o servidor calcula pela distância depois de
   * geocodificar o endereço, que é a única hora em que ela existe.
   */
  const [taxa, setTaxa] = useState('');

  /**
   * Sem `useEffect` observando o resultado: a ação já devolve se deu certo,
   * então fechar o diálogo é consequência direta da submissão. Reagir a uma
   * mudança de estado que nós mesmos causamos é dar uma volta que só
   * acrescenta um render a mais e um caminho a mais para dar errado.
   */
  function handleSubmit(formData: FormData) {
    setError(null);

    /*
     * Os itens viajam como JSON num campo escondido. `FormData` não representa
     * lista de objetos sem inventar convenção de nome — e convenção de nome é
     * onde esse tipo de código quebra em silêncio quando alguém renomeia algo.
     */
    if (itens.length > 0) formData.set('items', JSON.stringify(itens));

    submit(async () => {
      const result = await createOrderAction(null, formData);

      if (result.ok) {
        setOpen(false);
        setItens([]);
        setTotalCents(0);
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
        {/*
          Altura limitada e rolagem interna: com o catálogo aberto o formulário
          passava da tela e o botão de lançar ficava inalcançável — pior ainda
          em notebook, que é onde isso é usado.
        */}
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
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

          <form action={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
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

              <Field
                label="Total"
                hint={itens.length > 0 ? 'itens + taxa' : undefined}
              >
                <Input
                  name="amountReais"
                  inputMode="decimal"
                  placeholder="0,00"
                  /*
                   * Com itens escolhidos o total vem deles. Deixar o campo
                   * editável ao lado da lista abriria a porta para os dois
                   * discordarem — e a versão errada seria a que aparece na
                   * conta do dia.
                   */
                  readOnly={itens.length > 0}
                  value={
                    itens.length > 0
                      ? (
                          (totalCents +
                            Math.round(Number(taxa || taxaPadraoReais || 0) * 100)) /
                          100
                        ).toFixed(2)
                      : undefined
                  }
                  onChange={itens.length > 0 ? () => undefined : undefined}
                />
              </Field>
            </div>

            <OrderItemsPicker
              produtos={produtos}
              grupos={grupos}
              onChange={(escolhidos, total) => {
                setItens(escolhidos);
                setTotalCents(total);
              }}
            />

            <div className="grid grid-cols-2 gap-3.5">
              <Field
                label="Taxa de entrega"
                hint={taxa === '' ? 'calculada pela distância' : 'valor fixo'}
              >
                <div className="flex gap-1.5">
                  {/*
                    O seletor existe para o caso comum — escolher uma faixa sem
                    digitar. O campo ao lado continua aceitando qualquer valor:
                    bairro complicado, cliente conhecido, promoção. A regra
                    poupa digitação, não discorda de quem está atendendo.
                  */}
                  {faixas.length > 0 ? (
                    <Select
                      value={taxa}
                      onChange={(evento) => setTaxa(evento.target.value)}
                      aria-label="Faixa de entrega"
                      className="min-w-0 flex-1"
                    >
                      <option value="">Automático</option>
                      {faixas.map((faixa) => (
                        <option key={faixa.km} value={faixa.reais.toFixed(2)}>
                          até {faixa.km} km — {faixa.reais.toFixed(2)}
                        </option>
                      ))}
                    </Select>
                  ) : null}

                  <Input
                    name="deliveryFeeReais"
                    inputMode="decimal"
                    value={taxa}
                    onChange={(evento) => setTaxa(evento.target.value)}
                    placeholder={taxaPadraoReais ? taxaPadraoReais.toFixed(2) : '0,00'}
                    className={faixas.length > 0 ? 'w-20' : undefined}
                  />
                </div>
              </Field>

              <Field label="Pagamento">
                <Select name="paymentMethod" defaultValue="">
                  <option value="">Não informado</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="PIX">Pix</option>
                  <option value="CREDIT">Crédito</option>
                  <option value="DEBIT">Débito</option>
                </Select>
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

            {/*
              O rodapé fica fora da área que rola: o botão de lançar precisa
              estar sempre visível, senão quem escolheu cinco itens tem que
              rolar de volta para concluir.
            */}
            <div className="sticky bottom-0 -mx-5 -mb-4 mt-1 flex justify-end gap-2 border-t bg-surface px-5 py-3">
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
