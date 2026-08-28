'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, CreditCard, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import {
  consultarPagamentoAction,
  type StatusPagamentoOnline,
} from '@/presentation/public-menu';
import { Button } from '../primitives';

/**
 * Volta do Checkout Pro. O cliente pagou (ou tentou) na página do Mercado Pago.
 *
 * A tela não confia no `status` da URL: o Mercado Pago pode devolver o cliente
 * antes do webhook. Por isso consulta o pagamento de verdade, e só então
 * libera o link de rastreio.
 */
export function CardCheckoutReturn({
  slug,
  orderId,
  paymentId,
  nomeLoja,
}: {
  slug: string;
  orderId: string;
  paymentId: string | null;
  nomeLoja: string;
}) {
  const [status, setStatus] = useState<StatusPagamentoOnline>('PENDING');
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [checando, checar] = useTransition();

  useEffect(() => {
    let cancelado = false;

    async function consultar(forcar: boolean) {
      const resultado = await consultarPagamentoAction(slug, orderId, forcar, paymentId);
      if (cancelado) return;
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }
      setErro(null);
      setStatus(resultado.status);
      setTrackingUrl(resultado.trackingUrl);
    }

    void consultar(true);

    if (status === 'PAID' || status === 'REJECTED' || status === 'EXPIRED') {
      return () => {
        cancelado = true;
      };
    }

    const intervalo = setInterval(() => {
      void consultar(true);
    }, 3000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [slug, orderId, paymentId, status]);

  function conferirDeNovo() {
    checar(async () => {
      const resultado = await consultarPagamentoAction(slug, orderId, true, paymentId);
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }
      setErro(null);
      setStatus(resultado.status);
      setTrackingUrl(resultado.trackingUrl);
    });
  }

  if (status === 'PAID' && trackingUrl) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Check className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-ink">Pagamento aprovado</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {nomeLoja} já recebeu o pedido. Acompanhe a entrega pelo link abaixo.
        </p>
        <Button asChild variant="primary">
          <a href={trackingUrl}>Acompanhar meu pedido</a>
        </Button>
      </main>
    );
  }

  if (status === 'REJECTED' || status === 'EXPIRED') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <X className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-ink">
          {status === 'EXPIRED' ? 'O pagamento expirou' : 'Cartão recusado'}
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {status === 'EXPIRED'
            ? 'O tempo para pagar acabou. Faça um novo pedido para tentar de novo.'
            : 'O banco não autorizou. Confira o cartão ou pague com Pix no próximo pedido.'}
        </p>
        <Button asChild variant="primary">
          <a href={`/cardapio/${slug}`}>Voltar ao cardápio</a>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-raised text-ink">
        {status === 'IN_REVIEW' ? (
          <TriangleAlert className="size-6" aria-hidden />
        ) : (
          <CreditCard className="size-6" aria-hidden />
        )}
      </span>
      <h1 className="text-xl font-semibold text-ink">
        {status === 'IN_REVIEW' ? 'Pagamento em análise' : 'Confirmando o pagamento'}
      </h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        {status === 'IN_REVIEW'
          ? 'O Mercado Pago ainda está conferindo o cartão. Isso pode levar alguns minutos. O pedido só chega na cozinha depois da aprovação.'
          : 'Estamos conferindo com o Mercado Pago. Não feche esta tela.'}
      </p>
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Aguardando confirmação…
      </p>
      {erro ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">{erro}</p>
      ) : null}
      <Button type="button" variant="outline" onClick={conferirDeNovo} disabled={checando}>
        {checando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
        {checando ? 'Conferindo…' : 'Já paguei'}
      </Button>
    </main>
  );
}
