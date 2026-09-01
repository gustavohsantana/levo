'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  ImageOff,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  alternarProdutoAction,
  moverCategoriaAction,
  moverProdutoAction,
  removerProdutoAction,
  renomearCategoriaAction,
  salvarProdutoAction,
} from '@/presentation/catalog-actions';
import { enviarImagemAction } from '@/presentation/upload-actions';
import type { OptionGroupView, ProductView } from '@/presentation/queries';
import { OptionGroups } from './option-groups';
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

export function Catalog({
  produtos,
  grupos,
  ordemCategorias,
}: {
  produtos: ProductView[];
  grupos: OptionGroupView[];
  ordemCategorias: string[];
}) {
  const [editando, setEditando] = useState<ProductView | null>(null);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState('');
  const [soSemFoto, setSoSemFoto] = useState(false);

  const semFoto = produtos.filter((p) => !p.imageUrl).length;

  /*
   * Busca e filtro escondem produto, então enquanto algum dos dois está ligado
   * as setas de mover somem: mover na lista filtrada trocaria a posição com um
   * vizinho que o dono não está vendo.
   */
  const filtrando = busca.trim().length > 0 || soSemFoto;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (soSemFoto && p.imageUrl) return false;
      if (!termo) return true;
      return [p.name, p.description ?? '', p.category ?? '']
        .join(' ')
        .toLowerCase()
        .includes(termo);
    });
  }, [produtos, busca, soSemFoto]);

  const porCategoria = agrupar(visiveis, ordemCategorias);

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
          grupos={grupos}
          onDone={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      ) : null}

      {produtos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, descrição ou categoria"
              aria-label="Buscar no catálogo"
              className="h-10 w-full rounded-lg bg-surface pl-9 pr-3 text-sm text-ink hairline outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/*
            Só aparece quando há o que filtrar. Um botão que não muda nada é pior
            do que botão nenhum: o dono clica e desconfia que travou.
          */}
          {semFoto > 0 ? (
            <Button
              variant={soSemFoto ? 'primary' : 'outline'}
              onClick={() => setSoSemFoto((x) => !x)}
            >
              <ImageOff />
              Sem foto ({semFoto})
            </Button>
          ) : null}
        </div>
      ) : null}

      {filtrando ? (
        <p className="-mt-4 text-xs text-ink-faint">
          {visiveis.length === 0
            ? 'Nenhum produto encontrado.'
            : `${visiveis.length} de ${produtos.length} itens. As setas de ordenar voltam quando você limpar a busca.`}
        </p>
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
              <CategoryHeader
                  categoria={categoria}
                  quantidade={itens.length}
                  podeMover={!filtrando}
                />

              <ul className="overflow-hidden rounded-lg bg-surface hairline">
                {itens.map((produto) => (
                  <ProductRow
                    key={produto.id}
                    produto={produto}
                    onEdit={setEditando}
                    podeMover={!filtrando}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/*
        Depois dos produtos, e não antes: quem chega aqui vem cadastrar o que
        vende. Grupo é a camada seguinte, e uma marmitaria nunca precisa dela.
      */}
      <div className="border-t pt-6">
        <OptionGroups grupos={grupos} categorias={categorias} />
      </div>
    </div>
  );
}

/**
 * O nome da categoria, editável no lugar.
 *
 * Corrigir "Bebida" para "Bebidas" exigia abrir cada produto — e ninguém faz
 * isso com quinze itens, então as duas ficavam convivendo e a tela do cliente
 * mostrava dois grupos do mesmo.
 *
 * "Sem categoria" não é editável: é o balde dos que não têm nenhuma, não uma
 * categoria de verdade. Renomeá-lo criaria uma chamada "Sem categoria".
 */
function CategoryHeader({
  categoria,
  quantidade,
  podeMover,
}: {
  categoria: string;
  quantidade: number;
  podeMover: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const editavel = categoria !== 'Sem categoria';

  function salvar() {
    const destino = nome.trim();

    if (!destino || destino === categoria) {
      setEditando(false);
      setNome(categoria);
      return;
    }

    setErro(null);
    startTransition(async () => {
      const resultado = await renomearCategoriaAction(categoria, destino);
      if (resultado.ok) setEditando(false);
      else setErro(resultado.error);
    });
  }

  if (editando) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <Input
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') salvar();
              if (evento.key === 'Escape') {
                setNome(categoria);
                setEditando(false);
              }
            }}
            autoFocus
            className="h-8 w-56 text-sm"
            aria-label={`Novo nome para ${categoria}`}
          />

          <Button size="sm" variant="outline" onClick={salvar} disabled={pendente}>
            {pendente ? <LoaderCircle className="animate-spin" /> : <Check />}
            Renomear
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNome(categoria);
              setEditando(false);
            }}
          >
            Cancelar
          </Button>
        </div>

        <p className="mt-1 text-xs text-ink-faint">
          Vale para os {quantidade} itens. Usar o nome de outra categoria funde as duas.
        </p>
        {erro ? <p className="mt-1 text-xs text-danger">{erro}</p> : null}
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-1.5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {categoria}
      </h2>

      {editavel ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Renomear ${categoria}`}
          className="rounded p-0.5 text-ink-faint opacity-0 transition hover:bg-raised hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-60"
        >
          <Pencil className="size-3" aria-hidden />
        </button>
      ) : null}

      {editavel && podeMover ? (
        <Setas
          rotulo={categoria}
          pendente={pendente}
          onMover={(direcao) =>
            startTransition(async () => void (await moverCategoriaAction(categoria, direcao)))
          }
        />
      ) : null}
    </div>
  );
}

/**
 * Subir e descer, um passo por toque.
 *
 * Setas em vez de arrastar porque o dono mexe no cardápio pelo celular, entre
 * um pedido e outro: arrastar numa lista que rola briga com a rolagem, e um
 * toque errado reordena sem ele perceber. Seta erra pouco e desfaz com o toque
 * de volta.
 */
function Setas({
  rotulo,
  pendente,
  onMover,
}: {
  rotulo: string;
  pendente: boolean;
  onMover: (direcao: 'cima' | 'baixo') => void;
}) {
  return (
    <span className="ml-auto flex shrink-0 items-center">
      {(['cima', 'baixo'] as const).map((direcao) => (
        <button
          key={direcao}
          type="button"
          disabled={pendente}
          onClick={() => onMover(direcao)}
          aria-label={`Mover ${rotulo} para ${direcao}`}
          className="rounded p-1 text-ink-faint transition hover:bg-raised hover:text-ink disabled:opacity-40"
        >
          {direcao === 'cima' ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </button>
      ))}
    </span>
  );
}

function ProductRow({
  produto,
  onEdit,
  podeMover,
}: {
  produto: ProductView;
  onEdit: (p: ProductView) => void;
  podeMover: boolean;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <li
      className={`flex items-center gap-3 border-b px-4 py-3 last:border-b-0 ${
        produto.active ? '' : 'opacity-55'
      }`}
    >
      {podeMover ? (
        <Setas
          rotulo={produto.name}
          pendente={pendente}
          onMover={(direcao) =>
            startTransition(async () => void (await moverProdutoAction(produto.id, direcao)))
          }
        />
      ) : null}

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
      ) : (
        /* Sem foto é o caso comum, e o dono precisa enxergar quais são. */
        <span
          title="Sem foto"
          className="grid size-9 shrink-0 place-items-center rounded bg-raised text-ink-faint"
        >
          <ImageOff className="size-4" aria-hidden />
        </span>
      )}

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
  grupos,
  onDone,
}: {
  produto: ProductView | null;
  categorias: string[];
  grupos: OptionGroupView[];
  onDone: () => void;
}) {
  const [gruposDoProduto, setGruposDoProduto] = useState<string[]>(
    produto?.optionGroupIds ?? [],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, submit] = useTransition();
  const [imagem, setImagem] = useState(produto?.imageUrl ?? '');
  const [enviando, enviar] = useTransition();

  function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);

    const dados = new FormData();
    dados.set('file', arquivo);

    enviar(async () => {
      const resultado = await enviarImagemAction(dados);
      if (resultado.ok) setImagem(resultado.url);
      else setErro(resultado.error);
    });
  }

  function handleSubmit(formData: FormData) {
    setErro(null);
    formData.set('optionGroupIds', gruposDoProduto.join(','));

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

        <Field label="Foto" hint="envie do computador ou cole um endereço">
          <div className="flex items-center gap-3">
            {imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagem} alt="" className="size-14 shrink-0 rounded object-cover" />
            ) : null}

            <div className="min-w-0 flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(evento) => escolherArquivo(evento.target.files?.[0])}
                disabled={enviando}
                className="block w-full text-xs text-ink-muted file:mr-2 file:rounded file:border file:bg-raised file:px-2 file:py-1 file:text-xs file:text-ink"
              />

              {/*
                O campo de endereço fica: a importação do iFood preenche ele
                sozinha, e nem todo mundo tem o arquivo à mão — às vezes a foto
                já está no Instagram.
              */}
              <Input
                name="imageUrl"
                type="url"
                value={imagem}
                onChange={(evento) => setImagem(evento.target.value)}
                placeholder="https://…"
                className="mt-1.5"
              />
            </div>

            {enviando ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-ink-faint" />
            ) : null}
          </div>
        </Field>
      </div>

      {/*
        Só aparece quando já existe grupo cadastrado. Um campo vazio com
        "nenhum grupo" faria toda marmitaria se perguntar o que está faltando.
      */}
      {grupos.length > 0 ? (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Opções deste produto
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            O cliente escolhe estas opções ao pedir. A ordem aqui é a ordem na tela dele.
          </p>

          <div className="mt-2 flex flex-col gap-1">
            {grupos.map((grupo) => (
              <label
                key={grupo.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 text-sm text-ink hover:bg-raised"
              >
                <input
                  type="checkbox"
                  checked={gruposDoProduto.includes(grupo.id)}
                  onChange={() =>
                    setGruposDoProduto((atual) =>
                      atual.includes(grupo.id)
                        ? atual.filter((id) => id !== grupo.id)
                        : [...atual, grupo.id],
                    )
                  }
                />
                <span className="flex-1 truncate">{grupo.name}</span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {grupo.min > 0 ? 'obrigatório' : 'opcional'}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

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
function agrupar(
  produtos: ProductView[],
  ordem: string[],
): Array<[string, ProductView[]]> {
  const mapa = new Map<string, ProductView[]>();

  for (const produto of produtos) {
    const chave = produto.category ?? 'Sem categoria';
    const atual = mapa.get(chave);
    if (atual) atual.push(produto);
    else mapa.set(chave, [produto]);
  }

  /*
   * A ordem é a que o dono escolheu. "Sem categoria" fica sempre no fim: é o
   * balde de quem ainda não foi organizado, não uma categoria de verdade.
   */
  const posicao = new Map(ordem.map((nome, i) => [nome, i]));

  return [...mapa.entries()].sort(([a], [b]) => {
    if (a === 'Sem categoria') return 1;
    if (b === 'Sem categoria') return -1;
    const pa = posicao.get(a) ?? Number.MAX_SAFE_INTEGER;
    const pb = posicao.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, 'pt-BR');
  });
}
