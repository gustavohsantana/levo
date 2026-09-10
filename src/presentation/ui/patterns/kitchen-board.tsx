'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChefHat, Clock, LoaderCircle, Printer } from 'lucide-react';
import { advanceOrderStageAction } from '@/presentation/actions';
import type { OrderView } from '@/presentation/queries';
import { SinoDePedidos } from './order-bell';

/**
 * A tela da cozinha.
 *
 * Fica num tablet preso na parede, a um metro de distância, e quem olha está com
 * a mão suja e o barulho da coifa. Isso muda tudo: nada de menu, nada de
 * confirmação, nada abaixo de dois centímetros. Cada pedido tem UM botão, e ele
 * ocupa a largura do cartão.
 *
 * Três colunas, uma direção. O pedido anda para a direita e nunca volta —
 * desfazer engano é trabalho do painel, não de quem está fritando.
 */
const CINCO_SEGUNDOS = 5_000;

export function KitchenBoard({ pedidos }: { pedidos: OrderView[] }) {
  const router = useRouter();

  /*
   * Recarrega sozinho: ninguém na cozinha vai tocar em "atualizar" com a mão
   * cheia de massa, e pedido novo que não aparece é pedido que atrasa.
   */
  useEffect(() => {
    const t = setInterval(() => router.refresh(), CINCO_SEGUNDOS);
    return () => clearInterval(t);
  }, [router]);

  const novos = pedidos.filter((p) => p.stage === 'NOVO');
  const fazendo = pedidos.filter((p) => p.stage === 'MONTANDO');
  const prontos = pedidos.filter((p) => p.stage === 'PRONTO');

  return (
    <main className="min-h-dvh bg-canvas px-4 py-4">
      <div className="mb-3 flex items-baseline gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <ChefHat className="size-5" aria-hidden />
          Cozinha
        </h1>
        <p className="text-sm text-ink-muted">
          {pedidos.length === 0 ? 'Nada na fila' : `${pedidos.length} na fila`}
        </p>

        {/*
          Aqui o sino vale ainda mais que no painel: a cozinha não fica de olho
          no tablet, ela olha quando ouve.
        */}
        <div className="ml-auto">
          <SinoDePedidos novos={novos.map((p) => ({ id: p.id, cliente: p.customerName }))} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Coluna titulo="Chegaram" pedidos={novos} acao="CONFIRMED" rotulo="Começar" />
        <Coluna titulo="Preparando" pedidos={fazendo} acao="READY" rotulo="Pronto" />
        <Coluna titulo="Prontos" pedidos={prontos} acao={null} rotulo="" />
      </div>
    </main>
  );
}

function Coluna({
  titulo,
  pedidos,
  acao,
  rotulo,
}: {
  titulo: string;
  pedidos: OrderView[];
  /** `null` na última coluna: dali quem tira é o entregador. */
  acao: 'CONFIRMED' | 'READY' | null;
  rotulo: string;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium uppercase tracking-wide text-ink-faint">
        {titulo}
        <span className="numeric text-ink-muted">{pedidos.length}</span>
      </h2>

      <ul className="flex flex-col gap-2">
        {pedidos.map((pedido) => (
          <Cartao key={pedido.id} pedido={pedido} acao={acao} rotulo={rotulo} />
        ))}
      </ul>

      {pedidos.length === 0 ? (
        <p className="rounded-lg bg-surface px-3 py-6 text-center text-sm text-ink-faint hairline">
          vazio
        </p>
      ) : null}
    </section>
  );
}

function Cartao({
  pedido,
  acao,
  rotulo,
}: {
  pedido: OrderView;
  acao: 'CONFIRMED' | 'READY' | null;
  rotulo: string;
}) {
  const [pendente, avancar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <li className="rounded-lg bg-surface p-3 hairline">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-base font-semibold text-ink">
          <span className="truncate">{pedido.customerName}</span>
          {/* A cozinha precisa saber que é balcão: o cliente vem buscar, não sai
              motoboy. */}
          {pedido.pickup ? (
            <span className="shrink-0 rounded bg-moving-soft px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-moving">
              Retirada
            </span>
          ) : null}
        </p>
        {/*
          Há quanto tempo, não a que horas: quem está na cozinha precisa saber
          se está atrasando, e converter horário para tempo é conta que ninguém
          faz de cabeça com a chapa ligada.
        */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Imprime a comanda (cozinha) e o cupom (saco) numa aba nova. */}
          <a
            href={`/imprimir/pedido/${pedido.id}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Imprimir pedido de ${pedido.customerName}`}
            title="Imprimir comanda e cupom"
            className="grid size-7 place-items-center rounded-md text-ink-faint transition-colors hover:bg-raised hover:text-ink"
          >
            <Printer className="size-4" aria-hidden />
          </a>
          <span className="numeric flex items-center gap-1 text-sm text-ink-muted">
            <Clock className="size-3.5" aria-hidden />
            {minutosDesde(pedido.createdAt)}
          </span>
        </div>
      </div>

      {pedido.displayId ? (
        <p className="numeric text-xs text-ink-faint">#{pedido.displayId}</p>
      ) : null}

      {/*
        Os itens são o conteúdo, não um detalhe. É por isso que a tela existe —
        e cada linha carrega os complementos, que é onde mora o erro caro:
        "sem cebola" perdido é pedido refeito.
      */}
      <ul className="mt-2 flex flex-col gap-1.5">
        {pedido.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-snug text-ink">
            {/*
              Ícone pequeno só para bater o olho. Produto sem foto (ou item de
              marketplace) cai na inicial num quadradinho — mantém o alinhamento
              e ainda dá uma pista, em vez de deixar a linha torta.
            */}
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="mt-0.5 size-7 shrink-0 rounded object-cover"
                loading="lazy"
              />
            ) : (
              <span
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded bg-raised text-[11px] font-semibold uppercase text-ink-faint"
                aria-hidden
              >
                {item.name.trim().charAt(0)}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <span className="numeric font-semibold">{item.quantity}×</span> {item.name}
              {item.options.length > 0 ? (
                <span className="block text-xs text-ink-muted">{item.options.join(' · ')}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {pedido.notes ? (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs leading-snug text-amber-950">
          {pedido.notes}
        </p>
      ) : null}

      {acao ? (
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            avancar(async () => {
              const r = await advanceOrderStageAction(pedido.id, acao);
              if (!r.ok) setErro(r.error);
            })
          }
          /* Alvo grande: quem toca está com a mão ocupada e a tela a um metro. */
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-3 text-base font-semibold text-accent-contrast transition active:opacity-80 disabled:opacity-50"
        >
          {pendente ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
          ) : (
            <Check className="size-5" aria-hidden />
          )}
          {rotulo}
        </button>
      ) : (
        <p className="mt-3 text-center text-sm text-ink-faint">aguardando o entregador</p>
      )}

      {erro ? <p className="mt-2 text-xs text-danger">{erro}</p> : null}
    </li>
  );
}

/** "12 min" — e nunca um horário, que exigiria conta de cabeça. */
function minutosDesde(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}
