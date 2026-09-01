import type { Metadata } from 'next';
import { getCatalog, getOptionGroups } from '@/presentation/queries';
import { Catalog } from '@/presentation/ui/patterns/catalog';

export const metadata: Metadata = { title: 'Catálogo · Levô' };
export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const [produtos, grupos] = await Promise.all([getCatalog(), getOptionGroups()]);

  return <Catalog produtos={produtos} grupos={grupos} />;
}
