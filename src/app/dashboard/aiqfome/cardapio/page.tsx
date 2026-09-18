import type { Metadata } from 'next';
import { getCardapioAiqfome } from '@/presentation/queries';
import { AiqfomeCardapio } from '@/presentation/ui/patterns/aiqfome-cardapio';
import { AiqfomeTabs } from '@/presentation/ui/patterns/aiqfome-tabs';
import { EmptyState } from '@/presentation/ui/primitives';
import { ShoppingBag } from 'lucide-react';

export const metadata: Metadata = { title: 'aiqfome · Cardápio · Levô' };
export const dynamic = 'force-dynamic';

export default async function AiqfomeCardapioPage() {
  const cardapio = await getCardapioAiqfome();

  if (!cardapio) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="aiqfome não conectado"
        description="Conecte a loja ao aiqfome em Integrações para ver o cardápio por aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AiqfomeTabs ativo="cardapio" />
      <AiqfomeCardapio cardapio={cardapio} />
    </div>
  );
}
