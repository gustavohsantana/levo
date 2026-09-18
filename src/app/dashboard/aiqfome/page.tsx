import type { Metadata } from 'next';
import { getLojaAiqfome } from '@/presentation/queries';
import { AiqfomeLoja } from '@/presentation/ui/patterns/aiqfome-loja';
import { AiqfomeTabs } from '@/presentation/ui/patterns/aiqfome-tabs';
import { EmptyState } from '@/presentation/ui/primitives';
import { ShoppingBag } from 'lucide-react';

export const metadata: Metadata = { title: 'aiqfome · Levô' };
export const dynamic = 'force-dynamic';

export default async function AiqfomePage() {
  const loja = await getLojaAiqfome();

  if (!loja) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="aiqfome não conectado"
        description="Conecte a loja ao aiqfome em Integrações para gerir disponibilidade e horário por aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AiqfomeTabs ativo="loja" />
      <AiqfomeLoja loja={loja} />
    </div>
  );
}
