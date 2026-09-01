'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '../primitives';
import { currency } from '../format';
import type { MenuPublico } from '@/presentation/public-menu';

type Produto = MenuPublico['categorias'][number]['produtos'][number];

/**
 * Onde o cliente monta o produto: tamanho, sabores, borda, adicionais.
 *
 * O preço acompanha cada toque. Numa pizza em que o sabor carrega o valor, ver
 * o total só no fim é descobrir o preço depois de escolher — e a pessoa volta
 * atrás, ou desiste.
 */
export function MontarProduto({
  produto,
  aberto,
  onFechar,
  onAdicionar,
}: {
  produto: Produto;
  aberto: boolean;
  onFechar: () => void;
  onAdicionar: (escolha: Record<string, string[]>, unitPriceCents: number, nomes: string[]) => void;
}) {
  const [escolha, setEscolha] = useState<Record<string, string[]>>({});

  const unitPriceCents = produto.grupos.reduce((total, grupo) => {
    const marcadas = escolha[grupo.id] ?? [];
    return marcadas.reduce((soma, id) => {
      const opcao = grupo.options.find((o) => o.id === id);
      return soma + (opcao?.priceCents ?? 0);
    }, total);
  }, produto.priceCents);

  const nomes = produto.grupos.flatMap((grupo) =>
    (escolha[grupo.id] ?? [])
      .map((id) => grupo.options.find((o) => o.id === id)?.name)
      .filter((nome): nome is string => Boolean(nome)),
  );

  /** O primeiro grupo que ainda não foi satisfeito — vira a mensagem do botão. */
  const faltando = produto.grupos.find(
    (grupo) => (escolha[grupo.id] ?? []).length < grupo.min,
  );

  function alternar(grupo: Produto['grupos'][number], opcaoId: string) {
    setEscolha((atual) => {
      const marcadas = atual[grupo.id] ?? [];

      if (marcadas.includes(opcaoId)) {
        return { ...atual, [grupo.id]: marcadas.filter((id) => id !== opcaoId) };
      }

      /*
       * No grupo de escolha única, marcar troca em vez de recusar. Obrigar a
       * desmarcar antes é atrito puro: ninguém quer duas massas.
       */
      if (grupo.max === 1) return { ...atual, [grupo.id]: [opcaoId] };

      if (marcadas.length >= grupo.max) return atual;
      return { ...atual, [grupo.id]: [...marcadas, opcaoId] };
    });
  }

  /** Repetir a mesma opção: meia pizza de um sabor mais outra meia igual. */
  function repetir(grupo: Produto['grupos'][number], opcaoId: string, delta: number) {
    setEscolha((atual) => {
      const marcadas = atual[grupo.id] ?? [];
      if (delta > 0) {
        if (marcadas.length >= grupo.max) return atual;
        return { ...atual, [grupo.id]: [...marcadas, opcaoId] };
      }
      const indice = marcadas.lastIndexOf(opcaoId);
      if (indice < 0) return atual;
      return { ...atual, [grupo.id]: marcadas.filter((_, i) => i !== indice) };
    });
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-surface sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-ink">
                {produto.name}
              </Dialog.Title>
              {produto.description ? (
                <Dialog.Description className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                  {produto.description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {produto.grupos.map((grupo) => {
              const marcadas = escolha[grupo.id] ?? [];
              const completo = marcadas.length >= grupo.min;

              return (
                <section key={grupo.id} className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-medium text-ink">{grupo.name}</h3>
                    <span
                      className={`text-xs ${grupo.min > 0 && !completo ? 'text-warning' : 'text-ink-faint'}`}
                    >
                      {grupo.min > 0
                        ? `obrigatório · ${marcadas.length}/${grupo.min}`
                        : `opcional · até ${grupo.max}`}
                    </span>
                  </div>

                  <ul className="mt-1.5 overflow-hidden rounded-lg hairline">
                    {grupo.options.map((opcao) => {
                      const vezes = marcadas.filter((id) => id === opcao.id).length;
                      /* Repetir só faz sentido onde cabe mais de uma escolha. */
                      const podeRepetir = grupo.max > 1;

                      return (
                        <li
                          key={opcao.id}
                          className="flex items-center gap-3 border-b bg-surface px-3 py-2.5 last:border-b-0"
                        >
                          <button
                            type="button"
                            onClick={() => alternar(grupo, opcao.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span
                              className={`block truncate text-sm ${vezes > 0 ? 'font-medium text-ink' : 'text-ink-muted'}`}
                            >
                              {opcao.name}
                            </span>
                            {opcao.priceCents > 0 ? (
                              <span className="numeric text-xs text-ink-faint">
                                + {currency(opcao.priceCents)}
                              </span>
                            ) : null}
                          </button>

                          {podeRepetir ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Menos ${opcao.name}`}
                                disabled={vezes === 0}
                                onClick={() => repetir(grupo, opcao.id, -1)}
                              >
                                <Minus />
                              </Button>
                              <span className="numeric w-4 text-center text-sm text-ink">
                                {vezes}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Mais ${opcao.name}`}
                                disabled={marcadas.length >= grupo.max}
                                onClick={() => repetir(grupo, opcao.id, 1)}
                              >
                                <Plus />
                              </Button>
                            </div>
                          ) : (
                            <input
                              type="checkbox"
                              checked={vezes > 0}
                              onChange={() => alternar(grupo, opcao.id)}
                              aria-label={opcao.name}
                              className="shrink-0"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="border-t px-5 py-3">
            <Button
              variant="primary"
              className="w-full"
              disabled={Boolean(faltando)}
              onClick={() => {
                onAdicionar(escolha, unitPriceCents, nomes);
                setEscolha({});
              }}
            >
              {/*
                O botão diz o que falta, e não só "escolha as opções". Numa
                pizza com quatro grupos, "escolha a sua pizza com até 2 sabores"
                aponta para onde rolar.
              */}
              {faltando ? (
                <span className="truncate">{faltando.name}</span>
              ) : (
                <>
                  <span>Adicionar</span>
                  <span className="numeric ml-auto">{currency(unitPriceCents)}</span>
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
