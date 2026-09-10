'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { OptionGroupView, ProductView } from '@/presentation/queries';
import { Button, Input } from '../primitives';
import { currency } from '../format';
import { MontarProduto, type ProdutoMontavel } from './montar-produto';

export interface ItemEscolhido {
  productId: string;
  quantity: number;
  /** Desconto da linha em reais. A tela converte porcentagem antes de enviar. */
  discountReais?: number;
  /** O que foi escolhido nos grupos de opção: ids de opção, por grupo. */
  options?: Record<string, string[]>;
}

type Desconto = { valor: number; percentual: boolean };

/**
 * Uma linha do pedido: um produto já configurado.
 *
 * É linha, e não `produto → quantidade`, porque o mesmo produto pode entrar
 * duas vezes diferente — açaí de 300 e açaí de 500 são duas linhas do mesmo id.
 * O produto sem opção vira uma linha só, com `options` vazio.
 */
interface Linha {
  uid: string;
  productId: string;
  name: string;
  quantity: number;
  options: Record<string, string[]>;
  /** Preço unitário já com as opções somadas. Só para exibir — o servidor recalcula. */
  unitPriceCents: number;
  /** Nomes das opções escolhidas, para mostrar embaixo do nome. */
  nomes: string[];
  desconto?: Desconto;
}

/**
 * Escolher itens do catálogo para um pedido manual.
 *
 * O caso é o telefone tocando: alguém pede três coisas e quem atende precisa
 * anotar rápido, sem somar de cabeça. Por isso a busca filtra enquanto digita
 * e o total aparece o tempo todo — errar a soma é errar o troco.
 *
 * Produto com grupo de opção (açaí que pede tamanho) abre o mesmo configurador
 * do cardápio — antes ele entrava sem opção e o servidor recusava com "escolha
 * o tamanho", sem oferecer onde escolher. Produto sem opção segue no +/− direto.
 *
 * Sem catálogo cadastrado o componente some. Mostrar uma lista vazia com uma
 * busca que não acha nada é pior que não mostrar nada.
 */
export function OrderItemsPicker({
  produtos,
  grupos = [],
  onChange,
}: {
  produtos: ProductView[];
  grupos?: OptionGroupView[];
  onChange: (itens: ItemEscolhido[], totalCents: number) => void;
}) {
  const [busca, setBusca] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [montando, setMontando] = useState<{ produto: ProdutoMontavel; productId: string } | null>(
    null,
  );

  const disponiveis = useMemo(() => produtos.filter((p) => p.active), [produtos]);
  const gruposPorId = useMemo(() => new Map(grupos.map((g) => [g.id, g])), [grupos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return disponiveis;
    return disponiveis.filter(
      (p) =>
        p.name.toLowerCase().includes(termo) || (p.category ?? '').toLowerCase().includes(termo),
    );
  }, [disponiveis, busca]);

  /** Os grupos de opção de um produto, na ordem, resolvidos pelos ids. */
  function gruposDoProduto(produto: ProductView) {
    return produto.optionGroupIds
      .map((id) => gruposPorId.get(id))
      .filter((g): g is OptionGroupView => Boolean(g));
  }

  /** Desconto da linha, em centavos — sobre o preço unitário já com opções. */
  function descontoCents(linha: Linha): number {
    if (!linha.desconto?.valor) return 0;
    const bruto = linha.unitPriceCents * linha.quantity;
    const valor = linha.desconto.percentual
      ? Math.round((bruto * linha.desconto.valor) / 100)
      : Math.round(linha.desconto.valor * 100);
    // Nunca abaixo de zero: desconto maior que o item viraria crédito.
    return Math.min(bruto, Math.max(0, valor));
  }

  const totalCents = linhas.reduce(
    (total, l) => total + l.unitPriceCents * l.quantity - descontoCents(l),
    0,
  );

  function propagar(proximas: Linha[]) {
    const itens = proximas.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      discountReais: descontoCents(l) / 100,
      options: Object.keys(l.options).length > 0 ? l.options : undefined,
    }));
    const total = proximas.reduce(
      (soma, l) => soma + l.unitPriceCents * l.quantity - descontoCents(l),
      0,
    );
    onChange(itens, Math.round(total));
  }

  function atualizar(proximas: Linha[]) {
    setLinhas(proximas);
    propagar(proximas);
  }

  /** Produto sem opção: incrementa (ou cria) a linha única daquele produto. */
  function ajustarSimples(produto: ProductView, delta: number) {
    const uid = `simples:${produto.id}`;
    const existente = linhas.find((l) => l.uid === uid);
    const quantidade = Math.max(0, (existente?.quantity ?? 0) + delta);

    if (quantidade === 0) {
      atualizar(linhas.filter((l) => l.uid !== uid));
      return;
    }
    if (existente) {
      atualizar(linhas.map((l) => (l.uid === uid ? { ...l, quantity: quantidade } : l)));
      return;
    }
    atualizar([
      ...linhas,
      {
        uid,
        productId: produto.id,
        name: produto.name,
        quantity: quantidade,
        options: {},
        unitPriceCents: produto.priceCents,
        nomes: [],
      },
    ]);
  }

  function adicionarConfigurado(
    productId: string,
    name: string,
    escolha: Record<string, string[]>,
    unitPriceCents: number,
    nomes: string[],
  ) {
    atualizar([
      ...linhas,
      {
        uid: `opt:${crypto.randomUUID()}`,
        productId,
        name,
        quantity: 1,
        options: escolha,
        unitPriceCents,
        nomes,
      },
    ]);
  }

  function mudarQuantidade(uid: string, delta: number) {
    const proximas = linhas
      .map((l) => (l.uid === uid ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
      .filter((l) => l.quantity > 0);
    atualizar(proximas);
  }

  function removerLinha(uid: string) {
    atualizar(linhas.filter((l) => l.uid !== uid));
  }

  function mudarDesconto(uid: string, valor: number, percentual: boolean) {
    atualizar(linhas.map((l) => (l.uid === uid ? { ...l, desconto: { valor, percentual } } : l)));
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
          const gruposProduto = gruposDoProduto(produto);
          const temOpcoes = gruposProduto.length > 0;
          const quantidadeSimples =
            linhas.find((l) => l.uid === `simples:${produto.id}`)?.quantity ?? 0;

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

              {temOpcoes ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    setMontando({
                      productId: produto.id,
                      produto: {
                        name: produto.name,
                        description: produto.description,
                        priceCents: produto.priceCents,
                        grupos: gruposProduto,
                      },
                    })
                  }
                >
                  Montar
                </Button>
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Menos ${produto.name}`}
                    disabled={quantidadeSimples === 0}
                    onClick={() => ajustarSimples(produto, -1)}
                  >
                    <Minus />
                  </Button>
                  <span className="numeric w-5 text-center text-sm text-ink">
                    {quantidadeSimples}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mais ${produto.name}`}
                    onClick={() => ajustarSimples(produto, 1)}
                  >
                    <Plus />
                  </Button>
                </div>
              )}
            </li>
          );
        })}

        {filtrados.length === 0 ? (
          <li className="py-2 text-sm text-ink-faint">Nada com esse nome.</li>
        ) : null}
      </ul>

      {/*
        As linhas escolhidas, abaixo da busca: aqui se ajusta a quantidade do que
        foi montado, o desconto de cada uma, e se remove. Um campo por linha na
        lista inteira encheria a tela de caixas vazias para o que ninguém pediu.
      */}
      {linhas.length > 0 ? (
        <div className="mt-2 border-t pt-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Escolhidos</p>

          {linhas.map((linha) => {
            const aplicado = descontoCents(linha);
            const ehConfigurado = linha.uid.startsWith('opt:');

            return (
              <div key={linha.uid} className="flex items-center gap-2 py-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-ink-muted">
                    {linha.quantity}× {linha.name}
                  </p>
                  {linha.nomes.length > 0 ? (
                    <p className="truncate text-[11px] text-ink-faint">{linha.nomes.join(', ')}</p>
                  ) : null}
                </div>

                {/* Só a linha configurada ajusta quantidade aqui; a simples usa o +/− da lista. */}
                {ehConfigurado ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Menos ${linha.name}`}
                      onClick={() => mudarQuantidade(linha.uid, -1)}
                    >
                      <Minus />
                    </Button>
                    <span className="numeric w-4 text-center text-xs text-ink">
                      {linha.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Mais ${linha.name}`}
                      onClick={() => mudarQuantidade(linha.uid, 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                ) : null}

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linha.desconto?.valor ?? ''}
                  onChange={(evento) =>
                    mudarDesconto(
                      linha.uid,
                      Number(evento.target.value || 0),
                      linha.desconto?.percentual ?? true,
                    )
                  }
                  className="h-7 w-14 text-xs"
                  aria-label={`Desconto em ${linha.name}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    mudarDesconto(
                      linha.uid,
                      linha.desconto?.valor ?? 0,
                      !(linha.desconto?.percentual ?? true),
                    )
                  }
                  className="h-7 w-8 shrink-0 rounded border text-xs text-ink-muted hover:bg-raised"
                  aria-label="Alternar entre porcentagem e reais"
                >
                  {(linha.desconto?.percentual ?? true) ? '%' : 'R$'}
                </button>

                <span className="numeric w-14 shrink-0 text-right text-xs text-ink-faint">
                  {aplicado > 0 ? `−${currency(aplicado)}` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => removerLinha(linha.uid)}
                  aria-label={`Remover ${linha.name}`}
                  className="shrink-0 rounded p-1 text-ink-faint hover:bg-raised hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {montando ? (
        <MontarProduto
          produto={montando.produto}
          aberto
          onFechar={() => setMontando(null)}
          onAdicionar={(escolha, unitPriceCents, nomes) => {
            adicionarConfigurado(
              montando.productId,
              montando.produto.name,
              escolha,
              unitPriceCents,
              nomes,
            );
            setMontando(null);
          }}
        />
      ) : null}
    </div>
  );
}
