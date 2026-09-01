'use server';

import { revalidatePath } from 'next/cache';
import { containerFor } from '@/composition-root';
import { saveProductSchema } from '@/application/dto/schemas';
import { requireSession } from './http/session';
import { toFormError } from './http/error-mapper';

/**
 * O catálogo do estabelecimento.
 *
 * Existe separado de `actions.ts` pelo mesmo motivo que `integration-actions`:
 * são assuntos diferentes, e um arquivo que cresce sem tema vira o lugar onde
 * ninguém acha nada.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function salvarProdutoAction(formData: FormData): Promise<ActionResult> {
  const parsed = saveProductSchema.safeParse({
    id: formData.get('id') ?? '',
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    priceReais: formData.get('priceReais'),
    category: formData.get('category') ?? '',
    imageUrl: formData.get('imageUrl') ?? '',
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    const session = await requireSession();
    const { useCases } = containerFor(session.establishmentId);

    const produto = await useCases.saveProduct.execute({
      id: parsed.data.id || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceReais: parsed.data.priceReais,
      category: parsed.data.category || null,
      imageUrl: parsed.data.imageUrl || null,
    });

    /*
     * Os grupos vão junto, com o id que o `saveProduct` acabou de devolver.
     *
     * Numa ação separada, o produto novo nasceria sem eles até um segundo
     * clique — e o dono só descobriria pela tela do cliente, com o pedido já
     * chegando sem sabor escolhido.
     *
     * O campo vem como CSV porque `FormData` não representa lista sem inventar
     * convenção de nome; vazio significa "nenhum grupo", que é resposta válida.
     */
    const grupos = String(formData.get('optionGroupIds') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    await containerFor(session.establishmentId).read((repos) =>
      repos.optionGroups.setForProduct(produto.id, grupos),
    );

    revalidatePath('/dashboard/catalogo');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function alternarProdutoAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.setProductActive.execute(id, active);

    revalidatePath('/dashboard/catalogo');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function removerProdutoAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.removeProduct.execute(id);

    revalidatePath('/dashboard/catalogo');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function renomearCategoriaAction(
  de: string,
  para: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.renameCategory.execute(de, para);

    revalidatePath('/dashboard/catalogo');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Move um produto uma posição dentro da categoria.
 *
 * Setas em vez de arrastar: no celular — que é onde o dono mexe no cardápio
 * entre um pedido e outro — arrastar numa lista que rola briga com a rolagem, e
 * um toque errado reordena sem ele perceber. Seta é reversível e óbvia.
 */
export async function moverProdutoAction(
  id: string,
  direcao: 'cima' | 'baixo',
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.reorderCatalog.moverProduto(id, direcao);

    revalidatePath('/dashboard/catalogo');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/** Move uma categoria inteira uma posição no cardápio. */
export async function moverCategoriaAction(
  nome: string,
  direcao: 'cima' | 'baixo',
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await containerFor(session.establishmentId).useCases.reorderCatalog.moverCategoria(
      nome,
      direcao,
    );

    revalidatePath('/dashboard/catalogo');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
