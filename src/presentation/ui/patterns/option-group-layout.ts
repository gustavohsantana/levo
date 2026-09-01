import type { OptionGroupView, ProductView } from '@/presentation/queries';

/**
 * Junta cada lista na categoria dos produtos que a usam.
 *
 * "Sabores 35cm" mora em Pizzas, "Frutas" em Açaí. Lista sem produto fica no
 * fim, porque ainda não pertence a nada que o cliente peça.
 */
export function agruparPorUso(
  grupos: OptionGroupView[],
  produtos: ProductView[],
  ordemCategorias: string[],
): Array<{ categoria: string; grupos: OptionGroupView[] }> {
  const porId = new Map<string, Set<string>>();
  for (const produto of produtos) {
    const categoria = produto.category?.trim() || 'Sem categoria';
    for (const id of produto.optionGroupIds) {
      const atual = porId.get(id) ?? new Set<string>();
      atual.add(categoria);
      porId.set(id, atual);
    }
  }

  const baldes = new Map<string, OptionGroupView[]>();
  const semProduto: OptionGroupView[] = [];

  for (const grupo of grupos) {
    const cats = [...(porId.get(grupo.id) ?? [])];
    if (cats.length === 0) {
      semProduto.push(grupo);
      continue;
    }
    /*
     * Uma lista em duas categorias (raro) aparece na primeira, na ordem do
     * cardápio. Duplicar o card misturaria de novo o que a seção existe para
     * separar.
     */
    const categoria = cats.sort((a, b) => {
      const pa = ordemCategorias.indexOf(a);
      const pb = ordemCategorias.indexOf(b);
      const ia = pa === -1 ? Number.MAX_SAFE_INTEGER : pa;
      const ib = pb === -1 ? Number.MAX_SAFE_INTEGER : pb;
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b, 'pt-BR');
    })[0];
    const atual = baldes.get(categoria) ?? [];
    atual.push(grupo);
    baldes.set(categoria, atual);
  }

  const posicao = new Map(ordemCategorias.map((nome, i) => [nome, i]));
  const categorias = [...baldes.keys()].sort((a, b) => {
    if (a === 'Sem categoria') return 1;
    if (b === 'Sem categoria') return -1;
    const pa = posicao.get(a) ?? Number.MAX_SAFE_INTEGER;
    const pb = posicao.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, 'pt-BR');
  });

  const resultado = categorias.map((categoria) => ({
    categoria,
    grupos: baldes.get(categoria) ?? [],
  }));

  if (semProduto.length > 0) {
    resultado.push({ categoria: 'Ainda sem produto', grupos: semProduto });
  }

  return resultado;
}

/**
 * As listas que já pertencem a uma categoria.
 *
 * Pertencer = algum produto daquela categoria já usa. É assim que "Doces"
 * tem os opcionais de doce e não os de pizza, sem o dono cadastrar a lista
 * duas vezes.
 */
export function gruposDaCategoria(
  grupos: OptionGroupView[],
  produtos: ProductView[],
  categoria: string,
): OptionGroupView[] {
  const alvo = categoria.trim().toLowerCase();
  if (!alvo) return [];

  const ids = new Set<string>();
  for (const produto of produtos) {
    if ((produto.category ?? '').trim().toLowerCase() !== alvo) continue;
    for (const id of produto.optionGroupIds) ids.add(id);
  }

  return grupos.filter((g) => ids.has(g.id));
}

/** "obrigatório · 1" ou "opcional · até 3" — a regra em linguagem de gente. */
export function regra(grupo: { min: number; max: number }): string {
  const quantos = grupo.max === 1 ? '1' : `até ${grupo.max}`;
  return grupo.min > 0
    ? `obrigatório · ${grupo.min === grupo.max ? grupo.min : quantos}`
    : `opcional · ${quantos}`;
}
