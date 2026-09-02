'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { MenuPublico } from '@/presentation/public-menu';
import { gravarCarrinho, lerCarrinho, type LinhaCarrinho } from '@/presentation/menu-session';
import { MontarProduto } from './montar-produto';

type Produto = MenuPublico['categorias'][number]['produtos'][number];
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
  const [linhas, setLinhas] = useState<LinhaCarrinho[]>([]);
  const [pronto, setPronto] = useState(false);
  /** O produto que o cliente está montando. `null` quando nenhum. */
  const [montando, setMontando] = useState<Produto | null>(null);

  const produtos = useMemo(
    () => menu.categorias.flatMap((categoria) => categoria.produtos),
    [menu],
  );

  useEffect(() => {
    setLinhas(lerCarrinho(slug));
    setPronto(true);
  }, [slug]);

  useEffect(() => {
    if (!pronto) return;
    gravarCarrinho(slug, linhas);
  }, [pronto, slug, linhas]);

  const itens = linhas.filter((linha) => linha.quantity > 0);
  /*
   * O preço da linha, e não o do produto: com opções, duas pizzas do mesmo
   * tamanho custam valores diferentes conforme o sabor.
   */
  const subtotal = itens.reduce(
    (total, linha) => total + linha.unitPriceCents * linha.quantity,
    0,
  );

  const taxa = Math.round(menu.establishment.deliveryFeeReais * 100);
  const total = subtotal + (subtotal > 0 ? taxa : 0);

  /** Ajusta a quantidade de uma LINHA, não de um produto. */
  function ajustar(linhaId: string, delta: number) {
    setLinhas((atual) =>
      atual
        .map((linha) =>
          linha.id === linhaId
            ? { ...linha, quantity: Math.max(0, linha.quantity + delta) }
            : linha,
        )
        .filter((linha) => linha.quantity > 0),
    );
  }

  /**
   * Produto sem opção entra direto, somando na linha que já existe.
   *
   * Com opção, abre o diálogo: cada montagem vira uma linha própria, porque
   * duas pizzas com sabores diferentes não são a mesma coisa.
   */
  function adicionar(produto: Produto) {
    if (produto.grupos.length > 0) {
      setMontando(produto);
      return;
    }

    setLinhas((atual) => {
      const existente = atual.find(
        (linha) => linha.productId === produto.id && linha.nomes.length === 0,
      );
      if (existente) {
        return atual.map((linha) =>
          linha.id === existente.id ? { ...linha, quantity: linha.quantity + 1 } : linha,
        );
      }
      return [
        ...atual,
        {
          id: crypto.randomUUID(),
          productId: produto.id,
          quantity: 1,
          options: {},
          unitPriceCents: produto.priceCents,
          nomes: [],
        },
      ];
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
        {/*
          * O tempo aparece antes de escolher, não no fim.
          *
          * Quem está com pressa decide por ele — descobrir só na tela de
          * pagamento que vai demorar quarenta minutos é o abandono mais caro,
          * porque o carrinho já estava montado.
          */}
        {menu.establishment.preparo ? (
          <p className="mt-2 text-sm text-ink-faint">
            Saindo da cozinha em{' '}
            <span className="font-medium text-ink-muted">{menu.establishment.preparo}</span> hoje.
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6">
        {menu.categorias.map((categoria) => {
          /*
           * A coluna da foto vale por seção, não por produto.
           *
           * Sem isto a lista fica serrilhada: quem tem foto começa num recuo,
           * quem não tem começa na borda, e a seção parece quebrada. Numa
           * lanchonete de verdade a maioria dos produtos começa sem foto — o
           * caso comum é o vazio, então ele precisa parecer proposital.
           *
           * Decidir por seção, e não pelo cardápio inteiro, evita o outro
           * extremo: uma única foto em bebidas abriria um quadrado cinza ao
           * lado de todas as sobremesas que não têm nenhuma.
           */
          const comFoto = categoria.produtos.some((produto) => produto.imageUrl);

          return (
          <section key={categoria.nome}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {categoria.nome}
            </h2>

            <ul className="flex flex-col gap-2">
              {categoria.produtos.map((produto) => {
                /*
                 * A soma das linhas deste produto. Com opções, ele pode estar
                 * no carrinho três vezes com montagens diferentes — e o número
                 * no cartão precisa dizer quantos, não quantas montagens.
                 */
                const doProduto = linhas.filter((linha) => linha.productId === produto.id);
                const quantidade = doProduto.reduce((t, linha) => t + linha.quantity, 0);
                const linhaSimples = doProduto.find((linha) => linha.nomes.length === 0);


                return (
                  <li
                    key={produto.id}
                    className="flex items-center gap-3 rounded-lg bg-surface p-3 hairline"
                  >
                    {comFoto ? (
                      produto.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={produto.imageUrl}
                          alt=""
                          className="size-14 shrink-0 rounded-md object-cover"
                          loading="lazy"
                        />
                      ) : (
                        /*
                         * Marca do lugar da foto para quem ainda não tem uma. A
                         * inicial ancora a linha sem fingir que existe imagem —
                         * um quadrado vazio pareceria foto que falhou ao
                         * carregar.
                         */
                        <span
                          aria-hidden
                          className="grid size-14 shrink-0 place-items-center rounded-md bg-raised text-lg font-semibold text-ink-faint"
                        >
                          {produto.name.trim().charAt(0).toUpperCase()}
                        </span>
                      )
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{produto.name}</p>
                      {produto.description ? (
                        <p className="line-clamp-2 text-xs text-ink-faint">
                          {produto.description}
                        </p>
                      ) : null}
                      {/*
                        "a partir de" quando ha grupo obrigatorio cujo minimo
                        custa algo. Numa pizzaria em que o sabor carrega o
                        preco, mostrar o produto (zero) seria anunciar de graca.
                      */}
                      <p className="numeric mt-0.5 text-sm text-ink">
                        {produto.precoMinimoCents > produto.priceCents ? (
                          <span className="text-xs text-ink-faint">a partir de </span>
                        ) : null}
                        {currency(produto.precoMinimoCents)}
                      </p>

                      {/*
                        Diz o que vem depois do toque.
                        Sem isto, o cartão do açaí é igual ao de uma lata de
                        refrigerante — e o cliente não tem como saber que vai
                        abrir uma tela para escolher. Some quando não há grupo:
                        marmita entra direto e não deve prometer escolha.
                      */}

                    </div>

                    {/*
                      Produto com opcao SEMPRE abre o dialogo, mesmo ja estando
                      no carrinho: a proxima pizza pode ter outro sabor, e o
                      "+" simples copiaria a montagem anterior sem avisar.
                    */}
                    {produto.grupos.length > 0 ? (
                      <div className="flex shrink-0 items-center gap-1">
                        {/*
                          O menos existe mesmo com opções: sem ele, quem tocou
                          por engano não consegue desfazer sem ir ao carrinho.
                          Remove a montagem mais recente deste produto, que é o
                          que a pessoa acabou de fazer — as outras continuam
                          visíveis, uma a uma, no resumo do pedido.
                        */}
                        {quantidade > 0 ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const ultima = doProduto[doProduto.length - 1];
                                if (ultima) ajustar(ultima.id, -1);
                              }}
                              aria-label={`Menos ${produto.name}`}
                            >
                              <Minus />
                            </Button>
                            <span className="numeric w-5 text-center text-sm">{quantidade}</span>
                          </>
                        ) : null}
                        {/*
                          "Montar", e não "+".
                          O botão É a promessa: quem olha só ele — que é a
                          maioria — vê `+` e espera comprar num toque. A dica
                          abaixo do título ajuda quem lê o cartão inteiro, e
                          essa não é a pessoa com pressa.
                        */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => adicionar(produto)}
                          aria-label={`Montar ${produto.name}`}
                        >
                          {quantidade > 0 ? <Plus /> : 'Montar'}
                        </Button>
                      </div>
                    ) : quantidade === 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => adicionar(produto)}
                        aria-label={`Adicionar ${produto.name}`}
                      >
                        <Plus />
                      </Button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => linhaSimples && ajustar(linhaSimples.id, -1)}
                          aria-label={`Menos ${produto.name}`}
                        >
                          <Minus />
                        </Button>
                        <span className="numeric w-5 text-center text-sm">{quantidade}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => adicionar(produto)}
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
          );
        })}
      </div>

      {itens.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t bg-surface p-4">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="numeric text-sm font-semibold text-ink">{currency(total)}</p>
              <p className="text-xs text-ink-faint">
                {itens.reduce((n, linha) => n + linha.quantity, 0)} item(ns)
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

      {montando ? (
        <MontarProduto
          produto={montando}
          aberto
          onFechar={() => setMontando(null)}
          onAdicionar={(options, unitPriceCents, nomes) => {
            setLinhas((atual) => [
              ...atual,
              {
                id: crypto.randomUUID(),
                productId: montando.id,
                quantity: 1,
                options,
                unitPriceCents,
                nomes,
              },
            ]);
            setMontando(null);
          }}
        />
      ) : null}
    </main>
  );
}
