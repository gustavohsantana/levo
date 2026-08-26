'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { ProductView } from '@/presentation/queries';
import { Button, Input } from '../primitives';
import { currency } from '../format';

export interface ItemEscolhido {
  productId: string;
  quantity: number;
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

  const totalCents = escolhidos.reduce(
    (total, p) => total + p.priceCents * quantidades[p.id],
    0,
  );

  function ajustar(id: string, delta: number) {
    setQuantidades((atual) => {
      const proximo = Math.max(0, (atual[id] ?? 0) + delta);
      const novo = { ...atual, [id]: proximo };
      if (proximo === 0) delete novo[id];

      const itens = Object.entries(novo).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

      const total = itens.reduce((soma, item) => {
        const produto = disponiveis.find((p) => p.id === item.productId);
        return soma + (produto?.priceCents ?? 0) * item.quantity;
      }, 0);

      onChange(itens, total);
      return novo;
    });
  }

  if (disponiveis.length === 0) return null;

  return (
    <div className="rounded-md bg-raised p-3">
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

      <ul className="mt-2 max-h-52 overflow-y-auto">
        {filtrados.map((produto) => {
          const quantidade = quantidades[produto.id] ?? 0;

          return (
            <li key={produto.id} className="flex items-center gap-2 py-1.5">
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

        {filtrados.length === 0 ? (
          <li className="py-2 text-sm text-ink-faint">Nada com esse nome.</li>
        ) : null}
      </ul>
    </div>
  );
}
