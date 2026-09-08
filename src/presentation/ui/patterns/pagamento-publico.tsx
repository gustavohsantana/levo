'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, CreditCard, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import {
  consultarPagamentoAction,
  renovarPixAction,
  type PagamentoPublico,
  type StatusPagamentoOnline,
} from '@/presentation/public-menu';
import { gravarPagamentoPendente, limparPagamentoPendente } from '@/presentation/menu-session';
import { CartaoNaTela } from './cartao-na-tela';
import { Button } from '../primitives';
import { currency } from '../format';

/**
 * Terceira etapa: pagar. Pix e cartão ficam nesta URL, na nossa tela.
 *
 * É uma URL própria (`/cardapio/.../pagamento?pedido=`) para o cliente poder
 * voltar ao formulário se o Pix ainda não caiu, e para o F5 não apagar o QR.
 */
export function PagamentoPublico({
  slug,
  orderId,
  paymentId,
  nomeLoja,
  inicial,
}: {
  slug: string;
  orderId: string;
  paymentId: string | null;
  nomeLoja: string;
  inicial: PagamentoPublico;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusPagamentoOnline>(inicial.status);
  const [trackingToken, setTrackingToken] = useState(inicial.trackingToken);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [checando, checar] = useTransition();
  /*
   * Inicializador preguiçoso em vez de `useRef(Date.now())`: chamar Date.now()
   * no corpo do render é impuro. O valor continua fixo no montar, que é o que
   * a contagem de tempo desta tela precisa.
   */
  const [inicio] = useState(() => Date.now());

  /*
   * O código vive no estado, não em `inicial`: quando vence, a tela emite outro
   * sem recarregar a página nem obrigar o cliente a refazer o pedido.
   */
  const [codigo, setCodigo] = useState(inicial.qrCode);
  const [codigoBase64, setCodigoBase64] = useState(inicial.qrCodeBase64);
  const [expiraEm, setExpiraEm] = useState(inicial.expiresAt);
  const [renovando, renovar] = useTransition();
  const [agora, setAgora] = useState(() => Date.now());

  /*
   * Diferença entre o relógio do aparelho e o do servidor.
   *
   * Celular atrasado mostraria minutos restantes num código que já morreu, e a
   * pessoa pagaria um QR vencido — dinheiro sai e volta, sem gerar pagamento
   * nenhum. Medindo o desvio uma vez, o contador anda pelo relógio de quem
   * manda, que é o mesmo que o Mercado Pago usa para vencer a cobrança.
   */
  const [desvioMs, setDesvioMs] = useState(
    () => Date.parse(inicial.servidorEm) - Date.now(),
  );

  const restanteMs = expiraEm ? new Date(expiraEm).getTime() - (agora + desvioMs) : null;
  /*
   * Um QR vencido continua legível pelo banco: o cliente paga, o Mercado Pago
   * vê a cobrança expirada e devolve o dinheiro uns dois minutos depois — sem
   * gerar pagamento nenhum, então nem notificação chega aqui. Por isso o código
   * sai da tela assim que morre, em vez de seguir ali como se servisse.
   */
  const vencido = restanteMs !== null && restanteMs <= 0;

  useEffect(() => {
    if (inicial.metodo !== 'pix' || !expiraEm) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inicial.metodo, expiraEm]);

  function gerarCodigoNovo() {
    setAviso(null);
    renovar(async () => {
      const r = await renovarPixAction(slug, orderId);
      if (!r.ok) {
        setAviso(r.error);
        return;
      }
      setCodigo(r.qrCode);
      setCodigoBase64(r.qrCodeBase64);
      setExpiraEm(r.expiresAt);
      setDesvioMs(Date.parse(r.servidorEm) - Date.now());
      setAgora(Date.now());
      setStatus('PENDING');
    });
  }

  useEffect(() => {
    gravarPagamentoPendente(slug, { orderId, trackingToken: inicial.trackingToken });
  }, [slug, orderId, inicial.trackingToken]);

  useEffect(() => {
    if (status === 'PAID' && trackingToken) {
      limparPagamentoPendente(slug);
      gravarPagamentoPendente(slug, { trackingToken });
      const timer = setTimeout(() => {
        router.replace(`/t/${trackingToken}`);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [slug, status, trackingToken, router]);

  useEffect(() => {
    if (status !== 'PENDING' && status !== 'IN_REVIEW') return;

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
      setTrackingToken(resultado.trackingToken);
    }

    const precisaSondar =
      inicial.metodo === 'pix' || Boolean(paymentId) || (inicial.metodo === 'cartao' && !inicial.publicKey);

    if (!precisaSondar) return;

    if (inicial.metodo === 'cartao' || paymentId) {
      void consultar(true);
    }

    const intervalo = setInterval(() => {
      const forcar =
        inicial.metodo === 'cartao' || Date.now() - inicio > 20_000;
      void consultar(forcar);
    }, 3000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [slug, orderId, paymentId, status, inicial.metodo, inicial.publicKey]);

  function conferirDeNovo() {
    setAviso(null);
    checar(async () => {
      const resultado = await consultarPagamentoAction(slug, orderId, true, paymentId);
      if (!resultado.ok) {
        setAviso(resultado.error);
        return;
      }
      setStatus(resultado.status);
      setTrackingToken(resultado.trackingToken);
      if (resultado.status === 'PAID') return;
      if (resultado.status === 'EXPIRED') {
        setAviso('O código expirou. Volte e faça um novo pedido para gerar outro Pix.');
        return;
      }
      setAviso(
        'Ainda não identificamos o pagamento. Confira no banco e tente de novo em alguns segundos.',
      );
    });
  }

  async function copiarCodigo() {
    if (!codigo) return;
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const voltarPedido = `/cardapio/${slug}/pedido`;

  if (status === 'PAID') {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Check className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-ink">Pagamento confirmado</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {nomeLoja} já recebeu o pedido. Abrindo o acompanhamento…
        </p>
        <Button asChild variant="primary">
          <a href={`/t/${trackingToken}`}>Acompanhar meu pedido</a>
        </Button>
      </main>
    );
  }

  if (
    (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED')
    && !(inicial.publicKey && status === 'REJECTED')
  ) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <X className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-ink">
          {status === 'EXPIRED' ? 'O pagamento expirou' : 'Pagamento não confirmado'}
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {status === 'EXPIRED'
            ? 'O tempo para pagar acabou. Gere outro código — o pedido continua o mesmo.'
            : 'O banco não autorizou. Volte e tente outro cartão, Pix ou pagamento na entrega.'}
        </p>
        {/*
          Antes daqui saía "volte e faça outro pedido". Só que o pedido está
          certo: o que morreu foi o código. Refazer tudo é o caminho onde a
          maioria desiste.
        */}
        {status === 'EXPIRED' && inicial.metodo === 'pix' ? (
          <Button type="button" variant="primary" onClick={gerarCodigoNovo} disabled={renovando}>
            {renovando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {renovando ? 'Gerando…' : 'Gerar novo código Pix'}
          </Button>
        ) : null}
        <Button asChild variant={status === 'EXPIRED' ? 'outline' : 'primary'}>
          <Link href={voltarPedido}>Voltar ao pedido</Link>
        </Button>
        {aviso ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">{aviso}</p>
        ) : null}
      </main>
    );
  }

  if (inicial.metodo === 'cartao' && inicial.publicKey && (status === 'PENDING' || status === 'REJECTED')) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-6">
        <Link href={voltarPedido} className="self-start text-sm text-ink-muted hover:underline">
          ← Voltar ao pedido
        </Link>

        <header>
          <h1 className="text-xl font-semibold text-ink">Pague com cartão</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Crédito ou débito nesta tela — como o Pix, sem sair do cardápio. O dinheiro
            cai na conta de {nomeLoja}.
          </p>
        </header>

        {inicial.contaTeste ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">
            <p className="font-medium">Conta de teste do Mercado Pago</p>
            <p className="mt-1 leading-relaxed">
              Use o cartão Mastercard <span className="numeric">5031 4332 1540 6351</span>,
              CVV 123 e uma validade futura. No cartão real o banco recusa.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg bg-raised p-4 text-center">
          <p className="numeric text-lg font-semibold text-ink">{currency(inicial.amountCents)}</p>
        </div>

        {aviso ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">{aviso}</p>
        ) : null}

        <CartaoNaTela
          slug={slug}
          orderId={orderId}
          publicKey={inicial.publicKey}
          amountCents={inicial.amountCents}
          contaTeste={inicial.contaTeste}
          onPago={(proximo, token) => {
            setAviso(null);
            setStatus(proximo);
            setTrackingToken(token);
          }}
          onRecusado={(mensagem) => setAviso(mensagem)}
        />
      </main>
    );
  }

  if (inicial.metodo === 'pix' && status === 'PENDING') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-6">
        <Link href={voltarPedido} className="self-start text-sm text-ink-muted hover:underline">
          ← Voltar ao pedido
        </Link>

        <header>
          <h1 className="text-xl font-semibold text-ink">Pague com Pix</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Escaneie o QR Code ou copie o código no app do seu banco. Pode voltar se ainda não
            pagou — o código continua nesta página.
          </p>
        </header>

        {inicial.contaTeste ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">
            <p className="font-medium">Conta de teste do Mercado Pago</p>
            <p className="mt-1 leading-relaxed">
              Este Pix <strong>não funciona</strong> no app do banco (Nubank, Inter…). O código
              contém <code className="text-xs">TESTUSER</code> — é simulado. Em teste, o pagamento
              costuma confirmar sozinho em alguns segundos; ou conecte a conta{' '}
              <strong>de produção</strong> em Integrações para cobrar de verdade.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg bg-raised p-4 text-center">
          <p className="numeric text-lg font-semibold text-ink">{currency(inicial.amountCents)}</p>
          {vencido ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Este código venceu. Pagar um código vencido faz o banco devolver o
              dinheiro alguns minutos depois — gere outro abaixo.
            </p>
          ) : (
            <>
              {codigoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${codigoBase64}`}
                  alt="QR Code Pix"
                  className="mx-auto mt-4 size-56 rounded-md bg-white p-2"
                />
              ) : null}
              {restanteMs !== null ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Vale por mais <span className="numeric">{contagem(restanteMs)}</span>
                </p>
              ) : null}
            </>
          )}
        </div>

        {vencido ? (
          <Button type="button" variant="primary" onClick={gerarCodigoNovo} disabled={renovando}>
            {renovando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {renovando ? 'Gerando…' : 'Gerar novo código Pix'}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={copiarCodigo}>
            {copiado ? <Check /> : <Copy />}
            {copiado ? 'Copiado!' : 'Copiar código Pix'}
          </Button>
        )}

        {/*
          "Já paguei" continua na tela mesmo com o código vencido. O pior
          instante possível é justamente esse: quem pagou aos 29:50 vê a tela
          virar aos 30:00 e precisa de um jeito de dizer que o dinheiro saiu.
          A sondagem automática pegaria de qualquer forma, mas ficar sem botão
          bem na hora em que a pessoa está insegura com o próprio dinheiro é o
          contrário do que a tela deveria fazer.
        */}
        <Button
          type="button"
          variant={vencido ? 'outline' : 'primary'}
          onClick={conferirDeNovo}
          disabled={checando}
        >
          {checando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {checando ? 'Conferindo…' : 'Já paguei'}
        </Button>

        {aviso || erro ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">
            {aviso ?? erro}
          </p>
        ) : vencido ? null : (
          <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Aguardando pagamento…
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
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
      <Link href={voltarPedido} className="text-sm text-ink-muted hover:underline">
        ← Voltar ao pedido
      </Link>
    </main>
  );
}

/** mm:ss — o cliente precisa saber se dá tempo de abrir o banco. */
function contagem(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}
