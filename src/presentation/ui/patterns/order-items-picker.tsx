'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { ProductView } from '@/presentation/queries';
import { Button, Input } from '../primitives';
import { currency } from '../format';

export interface ItemEscolhido {
  productId: string;
  quantity: number;
  /** Desconto da linha em reais. A tela converte porcentagem antes de enviar. */
  discountReais?: number;
}

/**
 * Escolher itens do catálogo para um pedido manual.
 *
 * O caso é o telefone tocando: alguém pede três coisas e quem atende precisa
 * anotar rápido, sem somar de cabeça. Por isso a busca filtra enquanto digita
 * e o total aparece o tempo todo — errar a soma é errar o troco.
 *
 * Sem catálogo cadastrado o componente some. Mostrar uma lista vazia com uma
 * busca que não acha nada é pior que não mostrar nada.
 */
export function OrderItemsPicker({
  produtos,
  onChange,
}: {
  produtos: ProductView[];
  onChange: (itens: ItemEscolhido[], totalCents: number) => void;
}) {
  const [busca, setBusca] = useState('');
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  /** Por produto: quanto de desconto, e se o número digitado é % ou R$. */
  const [descontos, setDescontos] = useState<Record<string, { valor: number; percentual: boolean }>>({});

  const disponiveis = useMemo(
    () => produtos.filter((p) => p.active),
    [produtos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return disponiveis;

    return disponiveis.filter(
      (p) =>
        p.name.toLowerCase().includes(termo) ||
        (p.category ?? '').toLowerCase().includes(termo),
    );
  }, [disponiveis, busca]);

  const escolhidos = disponiveis.filter((p) => (quantidades[p.id] ?? 0) > 0);

  /**
   * Desconto da linha, em centavos.
   *
   * Percentual é arredondado na hora: o que o dono vê na tela é o que entra na
   * conta. Guardar a porcentagem e recalcular depois abriria a chance de um
   * centavo diferente entre a tela e o recibo.
   */
  function descontoCents(produto: ProductView, quantidade: number): number {
    const desconto = descontos[produto.id];
    if (!desconto?.valor) return 0;

    const bruto = produto.priceCents * quantidade;
    const valor = desconto.percentual
      ? Math.round((bruto * desconto.valor) / 100)
      : Math.round(desconto.valor * 100);

    // Nunca abaixo de zero: desconto maior que o item viraria crédito.
    return Math.min(bruto, Math.max(0, valor));
  }

  const totalCents = escolhidos.reduce(
    (total, p) =>
      total + p.priceCents * quantidades[p.id] - descontoCents(p, quantidades[p.id]),
    0,
  );

  function propagar(
    proximasQuantidades: Record<string, number>,
    proximosDescontos: typeof descontos,
  ) {
    const itens = Object.entries(proximasQuantidades).map(([productId, quantity]) => {
      const produto = disponiveis.find((p) => p.id === productId);
      const desconto = proximosDescontos[productId];

      const bruto = (produto?.priceCents ?? 0) * quantity;
      const cents = !desconto?.valor
        ? 0
        : Math.min(
            bruto,
            Math.max(
              0,
              desconto.percentual
                ? Math.round((bruto * desconto.valor) / 100)
                : Math.round(desconto.valor * 100),
            ),
          );

      return { productId, quantity, discountReais: cents / 100 };
    });

    const total = itens.reduce((soma, item) => {
      const produto = disponiveis.find((p) => p.id === item.productId);
      return soma + (produto?.priceCents ?? 0) * item.quantity - item.discountReais * 100;
    }, 0);

    onChange(itens, Math.round(total));
  }

  function ajustar(id: string, delta: number) {
    setQuantidades((atual) => {
      const proximo = Math.max(0, (atual[id] ?? 0) + delta);
      const novo = { ...atual, [id]: proximo };
      if (proximo === 0) delete novo[id];

      propagar(novo, descontos);
      return novo;
    });
  }

  function mudarDesconto(id: string, valor: number, percentual: boolean) {
    setDescontos((atual) => {
      const novo = { ...atual, [id]: { valor, percentual } };
      propagar(quantidades, novo);
      return novo;
    });
  }

  if (disponiveis.length === 0) return null;

  return (
    <div className="rounded-md bg-raised p-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Itens</p>
        {totalCents > 0 ? (
          <span className="numeric text-sm font-semibold text-ink">{currency(totalCents)}</span>
        ) : null}
      </div>

      <Input
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar no catálogo…"
        className="mt-2"
      />

      <ul className="mt-2 max-h-40 overflow-y-auto">
        {filtrados.map((produto) => {
          const quantidade = quantidades[produto.id] ?? 0;

          return (
            <li key={produto.id} className="flex items-center gap-2 py-1">
              {produto.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={produto.imageUrl}
                  alt=""
                  className="size-7 shrink-0 rounded object-cover"
                  loading="lazy"
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{produto.name}</p>
                <p className="numeric text-xs text-ink-faint">{currency(produto.priceCents)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Menos ${produto.name}`}
                  disabled={quantidade === 0}
                  onClick={() => ajustar(produto.id, -1)}
                >
                  <Minus />
                </Button>

                <span className="numeric w-5 text-center text-sm text-ink">{quantidade}</span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Mais ${produto.name}`}
                  onClick={() => ajustar(produto.id, 1)}
                >
                  <Plus />
                </Button>
              </div>
            </li>
          );
        })}

        {/*
          O desconto aparece só nos itens escolhidos, abaixo da lista. Um campo
          por linha na lista inteira encheria a tela de caixas vazias para
          produtos que ninguém pediu.
        */}
        {escolhidos.length > 0 ? (
          <li className="mt-2 border-t pt-2">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">
              Descontos
            </p>

            {escolhidos.map((produto) => {
              const desconto = descontos[produto.id];
              const aplicado = descontoCents(produto, quantidades[produto.id]);

              return (
                <div key={produto.id} className="flex items-center gap-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                    {produto.name}
                  </span>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={desconto?.valor ?? ''}
                    onChange={(evento) =>
                      mudarDesconto(
                        produto.id,
                        Number(evento.target.value || 0),
                        desconto?.percentual ?? true,
                      )
                    }
                    className="h-7 w-16 text-xs"
                    aria-label={`Desconto em ${produto.name}`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      mudarDesconto(produto.id, desconto?.valor ?? 0, !(desconto?.percentual ?? true))
                    }
                    className="h-7 w-9 shrink-0 rounded border text-xs text-ink-muted hover:bg-raised"
                    aria-label="Alternar entre porcentagem e reais"
                  >
                    {desconto?.percentual ?? true ? '%' : 'R$'}
                  </button>

                  <span className="numeric w-16 shrink-0 text-right text-xs text-ink-faint">
                    {aplicado > 0 ? `−${currency(aplicado)}` : ''}
                  </span>
                </div>
              );
            })}
          </li>
        ) : null}

        {filtrados.length === 0 ? (
          <li className="py-2 text-sm text-ink-faint">Nada com esse nome.</li>
        ) : null}
      </ul>
    </div>
  );
}
