'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Ban, MessageCircle, X } from 'lucide-react';
import type { OrderView } from '@/presentation/queries';
import { Button } from '../primitives';
import { clockTime, currency, phoneDisplay } from '../format';
import { CancelOrderDialog } from './cancel-order-dialog';
import { SourceTag } from './source-tag';

/**
 * O pedido inteiro.
 *
 * O cartão do quadro mostra o suficiente para decidir; isto mostra o suficiente
 * para **executar** — o que a cozinha prepara, o que o motoboy leva, quanto vai
 * cobrar e como. Sem esta tela o dono tinha que abrir o aplicativo do
 * marketplace para saber o que fazer, que é exatamente o trabalho dobrado que o
 * Levô existe para eliminar.
 */
const PAGAMENTOS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  CREDIT: 'Cartão de crédito',
  DEBIT: 'Cartão de débito',
  ONLINE: 'Pago no aplicativo',
};

const STATUS_PAGAMENTO: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago online',
  EXPIRED: 'Pagamento expirado',
  CANCELLED: 'Pagamento cancelado',
  REFUNDED: 'Estornado',
  IN_REVIEW: 'Pagamento em análise',
  REJECTED: 'Cartão recusado',
  CHARGED_BACK: 'Contestação (chargeback)',
};

export function OrderDetailDialog({
  pedido,
  trigger,
}: {
  pedido: OrderView;
  trigger: React.ReactNode;
}) {
  const subtotal = pedido.amountCents - pedido.deliveryFeeCents;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Dialog.Title className="truncate text-sm font-semibold text-ink">
                  {pedido.customerName}
                </Dialog.Title>
                <SourceTag source={pedido.source} />
              </div>
              <Dialog.Description className="mt-0.5 text-xs text-ink-muted">
                {clockTime(pedido.createdAt)}
                {pedido.displayId ? (
                  <>
                    {' · pedido '}
                    <span className="numeric">#{pedido.displayId}</span>
                  </>
                ) : null}
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Entrega
              </h3>
              <p className="mt-1 text-sm text-ink">{pedido.address}</p>
              {pedido.reference ? (
                <p className="text-sm text-ink-muted">{pedido.reference}</p>
              ) : null}

              {pedido.customerPhone ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="numeric text-sm text-ink-muted">
                    {phoneDisplay(pedido.customerPhone)}
                  </span>
                  {pedido.whatsappLink ? (
                    <Button asChild variant="ghost" size="sm">
                      <a href={pedido.whatsappLink} target="_blank" rel="noreferrer">
                        <MessageCircle />
                        WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>

            {pedido.items.length > 0 ? (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Itens
                </h3>

                <ul className="mt-1">
                  {pedido.items.map((item, indice) => (
                    <li key={indice} className="flex items-start gap-2 py-1 text-sm">
                      <span className="numeric shrink-0 text-ink-muted">{item.quantity}×</span>
                      <span className="min-w-0 flex-1 text-ink">{item.name}</span>
                      <span className="numeric shrink-0 text-ink-muted">
                        {currency(item.unitPriceCents * item.quantity - item.discountCents)}
                        {item.discountCents > 0 ? (
                          <span className="ml-1 text-xs text-accent-ink">
                            −{currency(item.discountCents)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              /*
               * Pedido de marketplace não traz item nenhum: o iFood e o aiqfome
               * mandam o total, não a composição. Dizer isso é melhor que uma
               * lista vazia, que pareceria defeito nosso.
               */
              <p className="text-sm text-ink-faint">
                Esta plataforma não envia os itens do pedido — confira no aplicativo dela.
              </p>
            )}

            <section className="rounded-md bg-raised p-3">
              {pedido.items.length > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Itens</span>
                  <span className="numeric text-ink-muted">{currency(subtotal)}</span>
                </div>
              ) : null}

              {pedido.deliveryFeeCents > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Entrega</span>
                  <span className="numeric text-ink-muted">
                    {currency(pedido.deliveryFeeCents)}
                  </span>
                </div>
              ) : null}

              <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                <span className="text-ink">Total</span>
                <span className="numeric text-ink">{currency(pedido.amountCents)}</span>
              </div>

              {pedido.paymentMethod ? (
                <p className="mt-1.5 text-xs text-ink-muted">
                  {PAGAMENTOS[pedido.paymentMethod] ?? pedido.paymentMethod}
                  {pedido.paymentStatus
                    ? ` · ${STATUS_PAGAMENTO[pedido.paymentStatus] ?? pedido.paymentStatus}`
                    : null}
                </p>
              ) : null}
            </section>

            {pedido.notes ? (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Observações
                </h3>
                <p className="mt-1 text-sm text-ink">{pedido.notes}</p>
              </section>
            ) : null}
          </div>

          {/*
            Cancelar fica no rodapé do detalhe, longe do fluxo normal e atrás de
            um segundo diálogo: é a única ação daqui que o lojista não desfaz.
            Só o iFood por enquanto: no manual não há plataforma para avisar, e
            a API do aiqfome ainda não expõe cancelamento. Botão que sempre
            falha é pior que botão ausente — quando eles abrirem o endpoint,
            muda esta linha.
          */}
          {pedido.source === 'IFOOD' &&
          (pedido.status === 'NEW' || pedido.status === 'IN_ROUTE') ? (
            <div className="flex justify-end border-t px-5 py-3">
              <CancelOrderDialog
                orderId={pedido.id}
                customerName={pedido.customerName}
                trigger={
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
                    <Ban />
                    Cancelar pedido
                  </Button>
                }
              />
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
