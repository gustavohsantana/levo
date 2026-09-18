'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ImagePlus, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { CatalogoIfoodView } from '@/presentation/queries';
import type { ItemIfood } from '@/infrastructure/integrations/ifood/catalog';
import {
  adicionarGrupoCatalogoAction,
  carregarItemCatalogoAction,
  criarCategoriaCatalogoAction,
  criarItemCatalogoAction,
  editarComplementoCatalogoAction,
  editarItemCatalogoAction,
  precoComplementoCatalogoAction,
  precoItemCatalogoAction,
  removerItemIfoodAction,
  statusComplementoCatalogoAction,
  statusItemCatalogoAction,
} from '@/presentation/actions';
import { Button, Field, Input } from '../primitives';

/**
 * O cardápio no iFood, gerido de dentro do Levô — a tela da homologação Catalog.
 *
 * Três cenários, na ordem que a homologação pede: (1) categoria + item com foto,
 * (2) grupo de complementos com dois complementos, (3) alterações — nome e foto
 * pelo PUT, preço e disponibilidade pelos PATCH que o iFood exige. Cada ação
 * reflete no Portal do Parceiro.
 *
 * O item criado no cenário 1 vira o "item atual", guardado com os ids que o
 * iFood devolve; os cenários 2 e 3 operam sobre ele.
 */
export function IfoodCatalogo({ catalogo }: { catalogo: CatalogoIfoodView }) {
  const [categoria, setCategoria] = useState<{ id: string; name: string } | null>(null);
  const [item, setItem] = useState<ItemIfood | null>(null);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">iFood — cardápio</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Categoria, item, complementos e alterações, direto pelo Levô. O que muda aqui reflete no
          iFood.
        </p>
      </div>

      <Existentes
        catalogo={catalogo}
        itemAtivo={item}
        onItem={setItem}
        onCancelar={() => setItem(null)}
      />
      {item ? (
        <EditarPainel item={item} onItem={setItem} onCancelar={() => setItem(null)} />
      ) : (
        <Cenario1 catalogo={catalogo} categoria={categoria} onCategoria={setCategoria} onItem={setItem} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Itens já no cardápio — selecionar para editar                       */
/* ------------------------------------------------------------------ */

function Existentes({
  catalogo,
  itemAtivo,
  onItem,
  onCancelar,
}: {
  catalogo: CatalogoIfoodView;
  itemAtivo: ItemIfood | null;
  onItem: (i: ItemIfood) => void;
  onCancelar: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [pendente, submit] = useTransition();

  const comItens = catalogo.categorias.filter((c) => c.itens.length > 0);

  function carregar(it: CatalogoIfoodView['categorias'][number]['itens'][number]) {
    setErro(null);
    setCarregandoId(it.id);
    submit(async () => {
      const r = await carregarItemCatalogoAction(it.id, it.categoryId);
      setCarregandoId(null);
      if (r.ok && r.item) {
        /*
         * O preço e o status efetivos vêm da LISTAGEM (contexto DEFAULT), não do
         * detalhe: o detalhe devolve `price.value: 0` para itens já existentes,
         * porque o preço real mora no contexto. Salvar com 0 zeraria o preço no
         * iFood — então sobrescrevemos com o valor visível na listagem.
         */
        onItem({ ...r.item, priceValue: it.priceValue, status: it.status as ItemIfood['status'] });
      } else setErro(r.ok ? 'Sem retorno' : r.error);
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Itens no cardápio</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Clique em Editar para alterar um item e seus complementos, ou crie um novo abaixo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => submit(() => router.refresh())}
          disabled={pendente}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${pendente ? 'animate-spin' : ''}`} aria-hidden />
          Atualizar
        </button>
      </div>

      {comItens.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">Nenhum item ainda. Crie um no cenário 1.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {comItens.map((cat) => (
            <div key={cat.id}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">{cat.name}</p>
              <ul className="flex flex-col divide-y">
                {cat.itens.map((it) => {
                  const ativo = itemAtivo?.id === it.id;
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                        <Miniatura url={it.imageUrl} />
                        <span className="min-w-0 truncate">
                          {it.name}
                          <span className="text-ink-faint">
                            {' '}
                            · R$ {it.priceValue.toFixed(2)}
                            {it.status === 'AVAILABLE' ? '' : ' · pausado'}
                          </span>
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => (ativo ? onCancelar() : carregar(it))}
                        disabled={pendente}
                        className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-50 ${
                          ativo ? 'text-accent-ink' : 'text-ink-muted hover:bg-raised hover:text-ink'
                        }`}
                      >
                        {carregandoId === it.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : ativo ? (
                          <X className="size-3.5" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                        {ativo ? 'Cancelar' : 'Editar'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cenário 1: categoria + item                                         */
/* ------------------------------------------------------------------ */

function Cenario1({
  catalogo,
  categoria,
  onCategoria,
  onItem,
}: {
  catalogo: CatalogoIfoodView;
  categoria: { id: string; name: string } | null;
  onCategoria: (c: { id: string; name: string }) => void;
  onItem: (i: ItemIfood) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, submit] = useTransition();

  const [nomeCategoria, setNomeCategoria] = useState('Teste Homologação');
  const [nomeItem, setNomeItem] = useState('Produto Teste');
  const [preco, setPreco] = useState('19.90');
  const [ativo, setAtivo] = useState(true);
  const [foto, setFoto] = useState<File | null>(null);

  function criarCategoria() {
    setErro(null);
    submit(async () => {
      const r = await criarCategoriaCatalogoAction(catalogo.catalogId, nomeCategoria.trim());
      if (r.ok && r.categoria) onCategoria(r.categoria);
      else setErro(r.ok ? 'Sem retorno' : r.error);
    });
  }

  function criarItem() {
    setErro(null);
    if (!categoria) {
      setErro('Crie a categoria primeiro.');
      return;
    }
    submit(async () => {
      const imagemDataUri = foto ? await lerImagem(foto) : undefined;
      const r = await criarItemCatalogoAction({
        categoryId: categoria.id,
        nome: nomeItem.trim(),
        precoReais: paraReais(preco),
        ativo,
        imagemDataUri,
      });
      if (r.ok && r.item) onItem(r.item);
      else setErro(r.ok ? 'Sem retorno' : r.error);
    });
  }

  return (
    <Secao titulo="1 · Categoria e item">
      <div className="flex flex-col gap-3">
        <Field label="Nome da categoria">
          <div className="flex gap-2">
            <Input value={nomeCategoria} onChange={(e) => setNomeCategoria(e.target.value)} />
            <Button variant="outline" onClick={criarCategoria} disabled={pendente || !!categoria}>
              {categoria ? <Check className="size-4" /> : <Plus className="size-4" />}
              {categoria ? 'Criada' : 'Criar'}
            </Button>
          </div>
        </Field>
        {categoria ? <Confirmado texto={`Categoria "${categoria.name}" criada.`} /> : null}
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex flex-col gap-3">
          <Field label="Nome do item">
            <Input value={nomeItem} onChange={(e) => setNomeItem(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <Input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </Field>
            <Toggle rotulo="Ativo" ligado={ativo} onToggle={() => setAtivo((v) => !v)} />
          </div>
          <FotoInput foto={foto} onFoto={setFoto} />
        </div>
        {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
        <Button variant="primary" className="mt-3" onClick={criarItem} disabled={pendente || !categoria}>
          {pendente ? <LoaderCircle className="animate-spin" /> : <Plus />}
          Criar item
        </Button>
        <p className="mt-2 text-xs text-ink-faint">
          Ao criar, o item abre para edição — onde você adiciona complementos e faz alterações.
        </p>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------------ */
/* Editar item: o item e seus complementos, num lugar só               */
/* ------------------------------------------------------------------ */

function EditarPainel({
  item,
  onItem,
  onCancelar,
}: {
  item: ItemIfood;
  onItem: (i: ItemIfood) => void;
  onCancelar: () => void;
}) {
  const router = useRouter();
  const opcoes = item.grupos[0]?.opcoes ?? [];
  const [confirmar, setConfirmar] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const [excluindo, excluir] = useTransition();

  function excluirItem() {
    if (!item.produto.id) return;
    setErroExcluir(null);
    excluir(async () => {
      const r = await removerItemIfoodAction(item.produto.id!);
      if (r.ok) {
        onCancelar();
        router.refresh();
      } else {
        setErroExcluir(r.error);
        setConfirmar(false);
      }
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Editar item</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {item.produto.name} — altere o item e seus complementos aqui.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-raised hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
          Fechar
        </button>
      </div>

      {item.produto.id ? (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          {confirmar ? (
            <>
              <span className="text-xs text-danger">Excluir “{item.produto.name}” do iFood?</span>
              <Button variant="danger" size="sm" onClick={excluirItem} disabled={excluindo}>
                {excluindo ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                Confirmar exclusão
              </Button>
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                disabled={excluindo}
                className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger hover:bg-danger-soft"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Excluir item
            </button>
          )}
        </div>
      ) : null}
      {erroExcluir ? <p className="mt-2 text-sm text-danger">{erroExcluir}</p> : null}

      <div className="mt-3 flex flex-col gap-4">
        <EditarItem item={item} onItem={onItem} />

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Complementos</p>
          {opcoes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {opcoes.map((o, i) => (
                <EditarComplemento
                  key={o.id ?? i}
                  item={item}
                  optionId={o.id!}
                  rotulo={`Complemento ${i + 1}`}
                  onItem={onItem}
                />
              ))}
            </div>
          ) : (
            <CriarGrupo item={item} onItem={onItem} />
          )}
        </div>
      </div>
    </section>
  );
}

type Complemento = { nome: string; preco: string; ativo: boolean; foto: File | null };

/** O formulário para criar o grupo de complementos de um item que ainda não tem. */
function CriarGrupo({ item, onItem }: { item: ItemIfood; onItem: (i: ItemIfood) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, submit] = useTransition();

  const [nomeGrupo, setNomeGrupo] = useState('Adicionais');
  const [complementos, setComplementos] = useState<Complemento[]>([
    { nome: 'Complemento 1', preco: '2.50', ativo: true, foto: null },
  ]);

  function mudar(i: number, campo: keyof Complemento, valor: Complemento[keyof Complemento]) {
    setComplementos((cs) => cs.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }
  function adicionar() {
    setComplementos((cs) => [
      ...cs,
      { nome: `Complemento ${cs.length + 1}`, preco: '', ativo: true, foto: null },
    ]);
  }
  function remover(i: number) {
    setComplementos((cs) => cs.filter((_, j) => j !== i));
  }

  function criar() {
    setErro(null);
    submit(async () => {
      const payload = [];
      for (const c of complementos) {
        payload.push({
          nome: c.nome.trim(),
          precoReais: paraReais(c.preco),
          ativo: c.ativo,
          imagemDataUri: c.foto ? await lerImagem(c.foto) : undefined,
        });
      }
      const r = await adicionarGrupoCatalogoAction({
        item,
        nomeGrupo: nomeGrupo.trim(),
        min: 0,
        max: payload.length,
        complementos: payload,
      });
      if (r.ok && r.item) onItem(r.item);
      else setErro(r.ok ? 'Sem retorno' : r.error);
    });
  }

  return (
    <div className="rounded-md border p-3">
      <Field label="Nome do grupo">
        <Input value={nomeGrupo} onChange={(e) => setNomeGrupo(e.target.value)} />
      </Field>

      {complementos.map((c, i) => (
        <div key={i} className="mt-3 rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Complemento {i + 1}
            </p>
            {complementos.length > 1 ? (
              <button
                type="button"
                onClick={() => remover(i)}
                aria-label="Remover complemento"
                className="rounded p-1 text-ink-faint hover:bg-raised hover:text-danger"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Field label="Nome">
              <Input value={c.nome} onChange={(e) => mudar(i, 'nome', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={c.preco}
                  onChange={(e) => mudar(i, 'preco', e.target.value)}
                />
              </Field>
              <Toggle rotulo="Ativo" ligado={c.ativo} onToggle={() => mudar(i, 'ativo', !c.ativo)} />
            </div>
            <FotoInput foto={c.foto} onFoto={(f) => mudar(i, 'foto', f)} />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={adicionar}
        className="mt-3 flex w-fit items-center gap-1 text-sm text-accent-ink hover:underline"
      >
        <Plus className="size-4" aria-hidden />
        Adicionar complemento
      </button>

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
      <Button variant="primary" className="mt-3" onClick={criar} disabled={pendente}>
        {pendente ? <LoaderCircle className="animate-spin" /> : null}
        Criar grupo e complementos
      </Button>
    </div>
  );
}

function EditarItem({ item, onItem }: { item: ItemIfood; onItem: (i: ItemIfood) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, submit] = useTransition();
  const [nome, setNome] = useState(item.produto.name);
  const [preco, setPreco] = useState(item.priceValue.toFixed(2));
  const [foto, setFoto] = useState<File | null>(null);

  /*
   * Um "Salvar" só, embora sejam dois endpoints por baixo: nome e foto vão pelo
   * PUT (o iFood não tem PATCH para eles) e o preço pelo PATCH que a homologação
   * exige. Fazemos o PUT primeiro e o PATCH do preço depois, e só chamamos cada
   * um se aquilo mudou.
   */
  function salvar() {
    submit(async () => {
      setErro(null);
      setMsg(null);
      let atual = item;
      const nomeMudou = nome.trim() !== item.produto.name;
      if (nomeMudou || foto) {
        const r = await editarItemCatalogoAction({
          item: atual,
          novoNome: nome.trim(),
          novaImagemDataUri: foto ? await lerImagem(foto) : undefined,
        });
        if (!r.ok) return setErro(r.error);
        if (r.item) atual = r.item;
      }
      const novoPreco = paraReais(preco);
      if (novoPreco !== atual.priceValue) {
        const r = await precoItemCatalogoAction(atual.id!, novoPreco);
        if (!r.ok) return setErro(r.error);
        atual = { ...atual, priceValue: novoPreco };
      }
      onItem(atual);
      setFoto(null);
      setMsg('Alterações salvas.');
    });
  }

  function alternarStatus() {
    submit(async () => {
      setErro(null);
      setMsg(null);
      const ativo = item.status !== 'AVAILABLE';
      const r = await statusItemCatalogoAction(item.id!, ativo);
      if (!r.ok) return setErro(r.error);
      onItem({ ...item, status: ativo ? 'AVAILABLE' : 'UNAVAILABLE' });
      setMsg(ativo ? 'Item reativado.' : 'Item pausado.');
    });
  }

  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Item · {item.produto.name}</p>
      <div className="flex flex-col gap-2">
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <FotoInput foto={foto} onFoto={setFoto} atual={item.produto.imagePath} />
        <Field label="Preço (R$)">
          <Input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </Field>

        <div className="mt-1 flex items-center gap-2">
          <Button variant="primary" onClick={salvar} disabled={pendente}>
            {pendente ? <LoaderCircle className="animate-spin" /> : null}
            Salvar
          </Button>
          <Button variant="outline" onClick={alternarStatus} disabled={pendente}>
            {item.status === 'AVAILABLE' ? 'Pausar item' : 'Reativar item'}
          </Button>
        </div>
      </div>
      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
      {msg ? <p className="mt-2 text-sm text-accent-ink">{msg}</p> : null}
    </div>
  );
}

function EditarComplemento({
  item,
  optionId,
  rotulo,
  onItem,
}: {
  item: ItemIfood;
  optionId: string;
  rotulo: string;
  onItem: (i: ItemIfood) => void;
}) {
  const opcao = item.grupos.flatMap((g) => g.opcoes).find((o) => o.id === optionId);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, submit] = useTransition();
  const [nome, setNome] = useState(opcao?.name ?? '');
  const [preco, setPreco] = useState((opcao?.priceValue ?? 0).toFixed(2));
  const [foto, setFoto] = useState<File | null>(null);

  if (!opcao) return null;
  const atualStatus = opcao.status;

  function salvar() {
    if (!opcao) return;
    submit(async () => {
      setErro(null);
      setMsg(null);
      const nomeMudou = nome.trim() !== opcao.name;
      if (nomeMudou || foto) {
        const r = await editarComplementoCatalogoAction({
          item,
          optionId,
          novoNome: nome.trim(),
          novaImagemDataUri: foto ? await lerImagem(foto) : undefined,
        });
        if (!r.ok) return setErro(r.error);
        if (r.item) onItem(r.item);
      }
      const novoPreco = paraReais(preco);
      if (novoPreco !== opcao.priceValue) {
        const r = await precoComplementoCatalogoAction(optionId, novoPreco);
        if (!r.ok) return setErro(r.error);
      }
      setFoto(null);
      setMsg('Alterações salvas.');
    });
  }

  function alternarStatus() {
    submit(async () => {
      setErro(null);
      setMsg(null);
      const ativo = atualStatus !== 'AVAILABLE';
      const r = await statusComplementoCatalogoAction(optionId, ativo);
      if (!r.ok) return setErro(r.error);
      onItem({
        ...item,
        grupos: item.grupos.map((g) => ({
          ...g,
          opcoes: g.opcoes.map((o) =>
            o.id === optionId ? { ...o, status: ativo ? 'AVAILABLE' : 'UNAVAILABLE' } : o,
          ),
        })),
      });
      setMsg(ativo ? 'Complemento reativado.' : 'Complemento pausado.');
    });
  }

  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {rotulo} · {opcao.name} {atualStatus === 'AVAILABLE' ? '' : '(pausado)'}
      </p>
      <div className="flex flex-col gap-2">
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <FotoInput foto={foto} onFoto={setFoto} atual={opcao.imagePath} />
        <Field label="Preço (R$)">
          <Input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} />
        </Field>

        <div className="mt-1 flex items-center gap-2">
          <Button variant="primary" onClick={salvar} disabled={pendente}>
            {pendente ? <LoaderCircle className="animate-spin" /> : null}
            Salvar
          </Button>
          <Button variant="outline" onClick={alternarStatus} disabled={pendente}>
            {atualStatus === 'AVAILABLE' ? 'Pausar complemento' : 'Reativar complemento'}
          </Button>
        </div>
      </div>
      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
      {msg ? <p className="mt-2 text-sm text-accent-ink">{msg}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças reutilizadas                                                  */
/* ------------------------------------------------------------------ */

function Secao({
  titulo,
  children,
  desabilitada,
  aviso,
}: {
  titulo: string;
  children: React.ReactNode;
  desabilitada?: boolean;
  aviso?: string;
}) {
  return (
    <section className={`rounded-lg bg-surface p-4 hairline ${desabilitada ? 'opacity-60' : ''}`}>
      <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
      {desabilitada ? (
        <p className="mt-2 text-sm text-ink-faint">{aviso}</p>
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </section>
  );
}

function Confirmado({ texto }: { texto: string }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-sm text-accent-ink">
      <Check className="size-4 shrink-0" aria-hidden />
      {texto}
    </p>
  );
}

function Toggle({
  rotulo,
  ligado,
  onToggle,
  desabilitado,
}: {
  rotulo: string;
  ligado: boolean;
  onToggle: () => void;
  desabilitado?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">{rotulo}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={desabilitado}
        aria-pressed={ligado}
        className={`h-9 w-full rounded-md border text-sm ${
          ligado ? 'border-accent bg-accent-soft text-accent-ink' : 'text-ink-muted'
        } disabled:opacity-50`}
      >
        {ligado ? 'Sim' : 'Não'}
      </button>
    </div>
  );
}

function FotoInput({
  foto,
  onFoto,
  atual,
}: {
  foto: File | null;
  onFoto: (f: File | null) => void;
  /** Caminho/URL da foto já salva, para pré-visualizar antes de trocar. */
  atual?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const previa = foto ? URL.createObjectURL(foto) : atual ? urlDaImagem(atual) : null;
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">Foto</span>
      <div className="flex items-center gap-2">
        {previa ? (
          <img src={previa} alt="" className="size-11 shrink-0 rounded-md border object-cover" />
        ) : null}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex flex-1 items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-ink-muted hover:bg-raised"
        >
          <ImagePlus className="size-4" aria-hidden />
          {foto ? foto.name : atual ? 'Trocar foto' : 'Escolher foto (mín. 300×300)'}
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFoto(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/** Miniatura quadrada de uma imagem já salva; um espaço vazio quando não há. */
function Miniatura({ url }: { url?: string }) {
  if (!url) return <span className="size-9 shrink-0 rounded bg-raised" aria-hidden />;
  return <img src={url} alt="" className="size-9 shrink-0 rounded border object-cover" />;
}

/** Monta a URL pública da foto a partir do caminho relativo guardado no modelo. */
function urlDaImagem(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `https://static-images.ifood.com.br/pratos/${path}`;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function paraReais(v: string): number {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lê a foto e a devolve como data URI JPEG, já redimensionada.
 *
 * Duas razões: o iFood quer base64 num data URI, e a server action tem teto de
 * corpo — uma foto de celular crua (vários MB) estouraria. Reduzir para 1200px
 * e recomprimir resolve os dois, mantendo bem acima do mínimo de 300px do iFood.
 */
async function lerImagem(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1200;
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}
