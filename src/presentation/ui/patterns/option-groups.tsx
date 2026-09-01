'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Layers, LoaderCircle, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '../primitives';
import type { OptionGroupView } from '@/presentation/queries';
import {
  anexarGrupoNaCategoriaAction,
  removerGrupoAction,
  salvarGrupoAction,
} from '@/presentation/actions';

interface LinhaOpcao {
  id?: string;
  name: string;
  preco: string;
}

/**
 * Os grupos de opção do estabelecimento: tamanhos, sabores, bordas, adicionais.
 *
 * Ficam numa seção própria, e não dentro de cada produto, porque é isso que
 * eles são: objetos do estabelecimento, usados por vários produtos. "Frutas"
 * serve os quatro tamanhos de açaí, e reajustar a Nutella é um número — não
 * quatro.
 */
export function OptionGroups({
  grupos,
  categorias,
}: {
  grupos: OptionGroupView[];
  categorias: string[];
}) {
  const [editando, setEditando] = useState<OptionGroupView | null>(null);
  const [criando, setCriando] = useState(false);

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Layers className="size-4 text-ink-faint" aria-hidden />
            Grupos de opções
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Tamanhos, sabores, bordas, adicionais. Você cria uma vez e usa em quantos produtos
            quiser — mudar o preço aqui muda em todos.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCriando(true)}>
          <Plus />
          Novo grupo
        </Button>
      </div>

      {grupos.length === 0 ? (
        <p className="mt-4 rounded-lg bg-raised px-4 py-6 text-sm text-ink-muted">
          Nenhum grupo ainda. Crie um se você vende algo com tamanho, sabor ou adicional — uma
          marmitaria, por exemplo, não precisa de nenhum.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {grupos.map((grupo) => (
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
                    ? 'sem produto ainda'
                    : `em ${grupo.produtos} ${grupo.produtos === 1 ? 'produto' : 'produtos'}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

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

/** "obrigatório · 1" ou "opcional · até 3" — a regra em linguagem de gente. */
function regra(grupo: { min: number; max: number }): string {
  const quantos = grupo.max === 1 ? '1' : `até ${grupo.max}`;
  return grupo.min > 0 ? `obrigatório · ${grupo.min === grupo.max ? grupo.min : quantos}` : `opcional · ${quantos}`;
}

function GrupoDialog({
  grupo,
  categorias,
  onClose,
}: {
  grupo: OptionGroupView | null;
  categorias: string[];
  onClose: () => void;
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
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

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
              {grupo ? 'Editar grupo' : 'Novo grupo'}
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

            <Field label="Nome do grupo">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Tamanho, Sabores, Borda, Adicionais…"
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
                  Anexa este grupo a todos os produtos de uma categoria. Quem já tem não é
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
                              ? `Todos de "${categoria}" já tinham este grupo.`
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
