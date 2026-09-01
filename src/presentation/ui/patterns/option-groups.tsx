'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Layers, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '../primitives';
import type { OptionGroupView, ProductView } from '@/presentation/queries';
import {
  anexarGrupoNaCategoriaAction,
  removerGrupoAction,
  salvarGrupoAction,
} from '@/presentation/actions';
import { agruparPorUso, regra } from './option-group-layout';

interface LinhaOpcao {
  id?: string;
  name: string;
  preco: string;
}

export type GrupoSalvo = {
  id: string;
  name: string;
  min: number;
  max: number;
  options: Array<{ id: string; name: string; priceCents: number }>;
};

/**
 * Biblioteca das listas que vários produtos compartilham.
 *
 * Não é o lugar onde as opções nascem — isso acontece no produto. Aqui o dono
 * acha "Frutas" ou "Sabores 35cm" para reajustar um preço que vale em todos.
 * Agrupar pela categoria dos produtos que usam evita a grade misturada de
 * pizza, açaí e marmita no mesmo bloco.
 */
export function OptionGroups({
  grupos,
  produtos,
  categorias,
  ordemCategorias,
}: {
  grupos: OptionGroupView[];
  produtos: ProductView[];
  categorias: string[];
  ordemCategorias: string[];
}) {
  const [editando, setEditando] = useState<OptionGroupView | null>(null);
  const [criando, setCriando] = useState(false);

  if (grupos.length === 0) return null;

  const porUso = agruparPorUso(grupos, produtos, ordemCategorias);

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Layers className="size-4 text-ink-faint" aria-hidden />
            Opções compartilhadas
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Listas que vários produtos usam. Mudar o preço da Nutella aqui muda em todos os
            açaís — não precisa abrir produto por produto.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCriando(true)}>
          <Plus />
          Nova lista
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {porUso.map(({ categoria, grupos: daCategoria }) => (
          <div key={categoria}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {categoria}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {daCategoria.map((grupo) => (
                <li key={grupo.id}>
                  <button
                    type="button"
                    onClick={() => setEditando(grupo)}
                    className="w-full rounded-lg bg-surface p-3 text-left hairline hover:bg-raised"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-ink">{grupo.name}</span>
                      <span className="shrink-0 text-xs text-ink-faint">{regra(grupo)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted">
                      {grupo.options.map((o) => o.name).join(' · ')}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-faint">
                      {grupo.produtos === 0
                        ? 'ainda sem produto'
                        : `em ${grupo.produtos} ${grupo.produtos === 1 ? 'produto' : 'produtos'}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {criando || editando ? (
        <GrupoDialog
          grupo={editando}
          categorias={categorias}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      ) : null}
    </section>
  );
}

export function GrupoDialog({
  grupo,
  categorias,
  onClose,
  onSaved,
}: {
  grupo: OptionGroupView | null;
  categorias: string[];
  onClose: () => void;
  /** Depois de gravar: o formulário do produto anexa a lista na hora. */
  onSaved?: (grupo: GrupoSalvo) => void;
}) {
  const [nome, setNome] = useState(grupo?.name ?? '');
  const [min, setMin] = useState(String(grupo?.min ?? 0));
  const [max, setMax] = useState(String(grupo?.max ?? 1));
  const [linhas, setLinhas] = useState<LinhaOpcao[]>(
    grupo?.options.map((o) => ({
      id: o.id,
      name: o.name,
      preco: (o.priceCents / 100).toFixed(2),
    })) ?? [{ name: '', preco: '0,00' }],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ajuste, setAjuste] = useState('');
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

  /**
   * Aplica o mesmo ajuste a todos os preços de uma vez.
   *
   * Somar serve para "o broto custa R$ 20 a mais"; multiplicar, para reajuste
   * percentual. Arredonda em centavos porque `0,1 + 0,2` em ponto flutuante dá
   * 0,30000000000000004, e isso viraria preço na tela.
   */
  function aplicarAjuste(modo: 'somar' | 'multiplicar') {
    const valor = Number(ajuste.replace(',', '.'));
    if (!Number.isFinite(valor) || valor === 0) return;

    setLinhas((atual) =>
      atual.map((linha) => {
        const preco = Number(linha.preco.replace(',', '.')) || 0;
        const novo = modo === 'somar' ? preco + valor : preco * valor;
        return { ...linha, preco: Math.max(0, Math.round(novo * 100) / 100).toFixed(2) };
      }),
    );
    setAjuste('');
  }

  function alterar(indice: number, campo: keyof LinhaOpcao, valor: string) {
    setLinhas((atual) =>
      atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)),
    );
  }

  return (
    <Dialog.Root open onOpenChange={(aberto) => !aberto && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-surface shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <Dialog.Title className="text-sm font-semibold text-ink">
              {grupo ? 'Editar opções' : 'Novas opções'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {erro ? (
              <p className="mb-3 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>
            ) : null}
            {aviso ? (
              <p className="mb-3 rounded-sm bg-accent-soft px-3 py-2 text-sm text-accent-ink">
                {aviso}
              </p>
            ) : null}

            <Field label="Nome desta lista" hint="como o cliente vê: Sabores, Borda, Adicionais…">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Sabores, Borda, Adicionais…"
              />
            </Field>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Escolhas obrigatórias">
                <Input
                  type="number"
                  min={0}
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
              </Field>
              <Field label="Máximo de escolhas">
                <Input
                  type="number"
                  min={1}
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </Field>
            </div>

            {/*
              A regra em português, atualizando enquanto digita. "min 2 / max 2"
              não diz nada para quem cadastra; "obrigatório escolher 2" diz.
            */}
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              {Number(min) > 0
                ? `O cliente precisa escolher ${min === max ? min : `de ${min} a ${max}`}.`
                : `O cliente pode escolher até ${max}, ou nenhuma.`}
            </p>

            <div className="mt-5 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Opções
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLinhas((a) => [...a, { name: '', preco: '0,00' }])}
              >
                <Plus />
                Adicionar
              </Button>
            </div>

            {/*
              Ajuste em lote.
              Uma pizzaria com 57 sabores precisa da mesma lista em dois
              tamanhos, com preços diferentes. Sem isto são 57 campos digitados
              de novo; com isto é duplicar e aplicar "+20" ou "×1,45", revisando
              só as exceções. Foi o atalho que justificou o modelo inteiro.
            */}
            {linhas.length > 1 ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-ink-faint">Ajustar todos:</span>
                <Input
                  value={ajuste}
                  onChange={(e) => setAjuste(e.target.value)}
                  placeholder="20"
                  inputMode="decimal"
                  className="h-7 w-16 text-xs"
                  aria-label="Valor do ajuste"
                />
                <Button variant="ghost" size="sm" onClick={() => aplicarAjuste('somar')}>
                  + R$
                </Button>
                <Button variant="ghost" size="sm" onClick={() => aplicarAjuste('multiplicar')}>
                  ×
                </Button>
              </div>
            ) : null}

            <ul className="mt-1 flex flex-col gap-2">
              {linhas.map((linha, indice) => (
                <li key={indice} className="flex items-center gap-2">
                  <Input
                    value={linha.name}
                    onChange={(e) => alterar(indice, 'name', e.target.value)}
                    placeholder="Nome da opção"
                    className="flex-1"
                  />
                  <Input
                    value={linha.preco}
                    onChange={(e) => alterar(indice, 'preco', e.target.value)}
                    inputMode="decimal"
                    className="w-24"
                    aria-label="Preço"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover opção"
                    onClick={() => setLinhas((a) => a.filter((_, i) => i !== indice))}
                  >
                    <Trash2 className="text-ink-faint" />
                  </Button>
                </li>
              ))}
            </ul>

            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              O preço soma ao valor do produto. Deixe zero quando a escolha não custa nada — a base
              do açaí é obrigatória e não cobra.
            </p>

            {grupo && categorias.length > 0 ? (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Aplicar de uma vez
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Anexa esta lista a todos os produtos de uma categoria. Quem já tem não é
                  duplicado.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categorias.map((categoria) => (
                    <Button
                      key={categoria}
                      variant="outline"
                      size="sm"
                      disabled={pendente}
                      onClick={() =>
                        startTransition(async () => {
                          setErro(null);
                          const r = await anexarGrupoNaCategoriaAction(grupo.id, categoria);
                          if (!r.ok) {
                            setErro(r.error);
                            return;
                          }
                          setAviso(
                            r.afetados === 0
                              ? `Todos de "${categoria}" já tinham esta lista.`
                              : `Anexado a ${r.afetados} produto${r.afetados === 1 ? '' : 's'} de "${categoria}".`,
                          );
                          router.refresh();
                        })
                      }
                    >
                      {categoria}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t px-5 py-3">
            {grupo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pendente}
                onClick={() =>
                  startTransition(async () => {
                    setErro(null);
                    /*
                     * Duplicar SALVA uma cópia e fecha. Deixar a cópia só na
                     * tela faria o dono ajustar 57 preços e perder tudo se
                     * fechasse sem salvar.
                     */
                    const r = await salvarGrupoAction({
                      name: `${nome} (cópia)`,
                      min: Number(min) || 0,
                      max: Number(max) || 1,
                      options: linhas.map((linha) => ({
                        name: linha.name,
                        priceReais: Number(linha.preco.replace(',', '.')) || 0,
                      })),
                    });
                    if (!r.ok) {
                      setErro(r.error ?? 'Não foi possível duplicar.');
                      return;
                    }
                    onClose();
                    router.refresh();
                  })
                }
              >
                <Copy />
                Duplicar
              </Button>
            ) : null}

            {grupo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft"
                disabled={pendente}
                onClick={() =>
                  startTransition(async () => {
                    const r = await removerGrupoAction(grupo.id);
                    if (!r.ok) {
                      setErro(r.error ?? 'Não foi possível remover.');
                      return;
                    }
                    onClose();
                    router.refresh();
                  })
                }
              >
                Remover
              </Button>
            ) : null}

            <div className="ml-auto flex gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Voltar
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={pendente}
                onClick={() =>
                  startTransition(async () => {
                    setErro(null);
                    const r = await salvarGrupoAction({
                      id: grupo?.id,
                      name: nome,
                      min: Number(min) || 0,
                      max: Number(max) || 1,
                      options: linhas.map((linha) => ({
                        id: linha.id,
                        name: linha.name,
                        priceReais: Number(linha.preco.replace(',', '.')) || 0,
                      })),
                    });
                    if (!r.ok) {
                      setErro(r.error ?? 'Não foi possível salvar.');
                      return;
                    }
                    onSaved?.(r.grupo);
                    onClose();
                    router.refresh();
                  })
                }
              >
                {pendente ? <LoaderCircle className="animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
