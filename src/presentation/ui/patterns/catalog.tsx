'use client';

import { useMemo, useState, useTransition } from 'react';
import { BookOpen, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  alternarProdutoAction,
  removerProdutoAction,
  salvarProdutoAction,
} from '@/presentation/catalog-actions';
import type { ProductView } from '@/presentation/queries';
import { Button, EmptyState, Field, Input, Textarea } from '../primitives';
import { currency } from '../format';

/**
 * O catálogo do estabelecimento.
 *
 * A lista é agrupada por categoria porque é assim que quem atende ao telefone
 * procura — "tem pizza de calabresa?" — e não em ordem alfabética corrida.
 *
 * Item inativo continua visível, apagado. Escondê-lo faria o dono cadastrar
 * de novo o que já existe quando o estoque voltasse.
 */
/**
 * Categorias sugeridas quando o catálogo ainda está vazio.
 *
 * Não é taxonomia: é economia de digitação no primeiro dia. Quem vende outra
 * coisa escreve o nome que quiser, e a partir daí a própria categoria dele
 * passa a ser sugerida.
 */
const CATEGORIAS_PADRAO = [
  'Bebidas',
  'Combos',
  'Doces',
  'Lanches',
  'Massas',
  'Petiscos',
  'Pizzas',
  'Porções',
  'Saladas',
  'Sobremesas',
];

export function Catalog({ produtos }: { produtos: ProductView[] }) {
  const [editando, setEditando] = useState<ProductView | null>(null);
  const [criando, setCriando] = useState(false);

  const porCategoria = agrupar(produtos);

  /*
   * As que o lojista já usou vêm primeiro na lista de sugestões, porque são as
   * que ele vai usar de novo. As padrão entram só para completar — e somem da
   * sugestão quando ele já tem a sua.
   */
  const categorias = useMemo(() => {
    const usadas = produtos
      .map((p) => p.category)
      .filter((c): c is string => Boolean(c));

    return [...new Set([...usadas, ...CATEGORIAS_PADRAO])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [produtos]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Catálogo</h1>
          <p className="mt-1 text-sm text-ink-muted">
            O que você vende. Serve para montar pedido de telefone e WhatsApp sem digitar preço.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditando(null);
            setCriando(true);
          }}
        >
          <Plus />
          Novo produto
        </Button>
      </div>

      {criando || editando ? (
        <ProductForm
          produto={editando}
          categorias={categorias}
          onDone={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      ) : null}

      {produtos.length === 0 && !criando ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum produto cadastrado"
          description="Cadastre o que você vende para montar pedidos manuais em segundos."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {porCategoria.map(([categoria, itens]) => (
            <section key={categoria}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                {categoria}
              </h2>

              <ul className="overflow-hidden rounded-lg bg-surface hairline">
                {itens.map((produto) => (
                  <ProductRow key={produto.id} produto={produto} onEdit={setEditando} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({
  produto,
  onEdit,
}: {
  produto: ProductView;
  onEdit: (p: ProductView) => void;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <li
      className={`flex items-center gap-3 border-b px-4 py-3 last:border-b-0 ${
        produto.active ? '' : 'opacity-55'
      }`}
    >
      {produto.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a imagem é de
        // domínio de terceiro (iFood, aiqfome) e muda sem aviso; o otimizador
        // do Next exigiria liberar host a host.
        <img
          src={produto.imageUrl}
          alt=""
          className="size-9 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {produto.name}
          {produto.importado ? (
            <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-[11px] font-normal text-ink-faint">
              {produto.source}
            </span>
          ) : null}
        </p>
        {produto.description ? (
          <p className="truncate text-sm text-ink-faint">{produto.description}</p>
        ) : null}
      </div>

      <span className="numeric shrink-0 text-sm font-medium text-ink">
        {currency(produto.priceCents)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pendente}
          onClick={() =>
            startTransition(async () => void (await alternarProdutoAction(produto.id, !produto.active)))
          }
        >
          {produto.active ? 'Pausar' : 'Ativar'}
        </Button>

        <Button variant="ghost" size="sm" onClick={() => onEdit(produto)}>
          <Pencil />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={pendente}
          onClick={() => {
            /*
             * Confirmação só no apagar. Pausar é reversível com um clique, e
             * pedir confirmação para tudo treina o dono a clicar "sim" sem ler
             * — justamente no dia em que a caixa importa.
             */
            if (!confirm(`Apagar "${produto.name}" do catálogo?`)) return;
            startTransition(async () => void (await removerProdutoAction(produto.id)));
          }}
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>
    </li>
  );
}

function ProductForm({
  produto,
  categorias,
  onDone,
}: {
  produto: ProductView | null;
  categorias: string[];
  onDone: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, submit] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);

    submit(async () => {
      const resultado = await salvarProdutoAction(formData);
      if (resultado.ok) onDone();
      else setErro(resultado.error);
    });
  }

  return (
    <form action={handleSubmit} className="rounded-lg bg-surface p-5 hairline">
      <h2 className="font-semibold text-ink">
        {produto ? 'Editar produto' : 'Novo produto'}
      </h2>

      {produto?.importado ? (
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">
          Este item veio do {produto.source}. Editar aqui vale só dentro do Levô — nada é
          alterado na plataforma de origem.
        </p>
      ) : null}

      <input type="hidden" name="id" value={produto?.id ?? ''} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input name="name" defaultValue={produto?.name ?? ''} autoFocus required />
        </Field>

        <Field label="Preço (R$)">
          <Input
            name="priceReais"
            type="text"
            inputMode="decimal"
            defaultValue={produto ? (produto.priceCents / 100).toFixed(2) : ''}
            required
          />
        </Field>

        <Field label="Categoria" hint="escolha uma ou escreva a sua">
          {/*
            `datalist` em vez de `select`: sugere o que já existe sem fechar a
            porta para uma categoria nova. Um `select` obrigaria a cadastrar
            categoria antes de cadastrar produto — burocracia para quem só quer
            anotar o que vende.
          */}
          <Input
            name="category"
            list="categorias-do-catalogo"
            defaultValue={produto?.category ?? ''}
            placeholder="Pizzas, Bebidas…"
            autoComplete="off"
          />
          <datalist id="categorias-do-catalogo">
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
        </Field>

        <Field label="Descrição" hint="opcional">
          <Textarea name="description" rows={2} defaultValue={produto?.description ?? ''} />
        </Field>

        <Field
          label="Foto"
          hint="cole o endereço de uma imagem — a importação preenche sozinha"
        >
          <Input
            name="imageUrl"
            type="url"
            defaultValue={produto?.imageUrl ?? ''}
            placeholder="https://…"
          />
        </Field>
      </div>

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}

      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="primary" disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pendente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Sem categoria vai para o fim: é o balde de quem ainda não organizou. */
function agrupar(produtos: ProductView[]): Array<[string, ProductView[]]> {
  const mapa = new Map<string, ProductView[]>();

  for (const produto of produtos) {
    const chave = produto.category ?? 'Sem categoria';
    const atual = mapa.get(chave);
    if (atual) atual.push(produto);
    else mapa.set(chave, [produto]);
  }

  return [...mapa.entries()].sort(([a], [b]) => {
    if (a === 'Sem categoria') return 1;
    if (b === 'Sem categoria') return -1;
    return a.localeCompare(b);
  });
}
