'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { MenuPublico } from '@/presentation/public-menu';
import { gravarCarrinho, lerCarrinho } from '@/presentation/menu-session';
import { Button } from '../primitives';
import { currency } from '../format';

/**
 * O cardápio que o cliente vê — primeira etapa.
 *
 * "Fechar pedido" abre `/cardapio/[slug]/pedido`, um link de verdade, para o
 * voltar do celular devolver aqui com o carrinho intacto.
 */
export function PublicMenu({ menu }: { menu: MenuPublico }) {
  const router = useRouter();
  const slug = menu.establishment.slug;
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [pronto, setPronto] = useState(false);

  const produtos = useMemo(
    () => menu.categorias.flatMap((categoria) => categoria.produtos),
    [menu],
  );

  useEffect(() => {
    setQuantidades(lerCarrinho(slug));
    setPronto(true);
  }, [slug]);

  useEffect(() => {
    if (!pronto) return;
    gravarCarrinho(slug, quantidades);
  }, [pronto, slug, quantidades]);

  const itens = Object.entries(quantidades).filter(([, q]) => q > 0);
  const subtotal = itens.reduce((total, [id, quantidade]) => {
    const produto = produtos.find((p) => p.id === id);
    return total + (produto?.priceCents ?? 0) * quantidade;
  }, 0);

  const taxa = Math.round(menu.establishment.deliveryFeeReais * 100);
  const total = subtotal + (subtotal > 0 ? taxa : 0);

  function ajustar(id: string, delta: number) {
    setQuantidades((atual) => {
      const proximo = Math.max(0, (atual[id] ?? 0) + delta);
      const novo = { ...atual, [id]: proximo };
      if (proximo === 0) delete novo[id];
      return novo;
    });
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-32 pt-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {menu.establishment.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Peça direto com a gente. Entrega com o nosso motoboy.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {menu.categorias.map((categoria) => (
          <section key={categoria.nome}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {categoria.nome}
            </h2>

            <ul className="flex flex-col gap-2">
              {categoria.produtos.map((produto) => {
                const quantidade = quantidades[produto.id] ?? 0;

                return (
                  <li
                    key={produto.id}
                    className="flex items-center gap-3 rounded-lg bg-surface p-3 hairline"
                  >
                    {produto.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={produto.imageUrl}
                        alt=""
                        className="size-14 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{produto.name}</p>
                      {produto.description ? (
                        <p className="line-clamp-2 text-xs text-ink-faint">
                          {produto.description}
                        </p>
                      ) : null}
                      <p className="numeric mt-0.5 text-sm text-ink">
                        {currency(produto.priceCents)}
                      </p>
                    </div>

                    {quantidade === 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ajustar(produto.id, 1)}
                        aria-label={`Adicionar ${produto.name}`}
                      >
                        <Plus />
                      </Button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => ajustar(produto.id, -1)}
                          aria-label={`Menos ${produto.name}`}
                        >
                          <Minus />
                        </Button>
                        <span className="numeric w-5 text-center text-sm">{quantidade}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => ajustar(produto.id, 1)}
                          aria-label={`Mais ${produto.name}`}
                        >
                          <Plus />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {itens.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t bg-surface p-4">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="numeric text-sm font-semibold text-ink">{currency(total)}</p>
              <p className="text-xs text-ink-faint">
                {itens.reduce((n, [, q]) => n + q, 0)} item(ns)
                {taxa > 0 ? ` · entrega ${currency(taxa)}` : ''}
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => router.push(`/cardapio/${slug}/pedido`)}
            >
              <ShoppingBag />
              Fechar pedido
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
