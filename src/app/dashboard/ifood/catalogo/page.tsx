import type { Metadata } from 'next';
import { getCatalogoIfood } from '@/presentation/queries';
import { IfoodCatalogo } from '@/presentation/ui/patterns/ifood-catalogo';
import { IfoodTabs } from '@/presentation/ui/patterns/ifood-tabs';
import { EmptyState } from '@/presentation/ui/primitives';
import { Store } from 'lucide-react';

export const metadata: Metadata = { title: 'iFood Cardápio · Levô' };
export const dynamic = 'force-dynamic';

export default async function IfoodCatalogoPage() {
  const catalogo = await getCatalogoIfood();

  if (!catalogo) {
    return (
      <EmptyState
        icon={Store}
        title="iFood não conectado"
        description="Conecte a loja ao iFood em Integrações para gerir o cardápio por aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <IfoodTabs ativo="cardapio" />
      <IfoodCatalogo catalogo={catalogo} />
    </div>
  );
}
