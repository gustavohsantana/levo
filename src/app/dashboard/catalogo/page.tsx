import type { Metadata } from 'next';
import { getCatalog, getOptionGroups, getOrdemCategorias } from '@/presentation/queries';
import { Catalog } from '@/presentation/ui/patterns/catalog';

export const metadata: Metadata = { title: 'Catálogo · Levô' };
export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const [produtos, grupos, ordemCategorias] = await Promise.all([
    getCatalog(),
    getOptionGroups(),
    getOrdemCategorias(),
  ]);

  return <Catalog produtos={produtos} grupos={grupos} ordemCategorias={ordemCategorias} />;
}
