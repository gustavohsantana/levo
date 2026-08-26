import type { Metadata } from 'next';
import { getCatalog } from '@/presentation/queries';
import { Catalog } from '@/presentation/ui/patterns/catalog';

export const metadata: Metadata = { title: 'Catálogo · Levô' };
export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  return <Catalog produtos={await getCatalog()} />;
}
