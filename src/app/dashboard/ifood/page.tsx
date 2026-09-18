import type { Metadata } from 'next';
import { getLojaIfood } from '@/presentation/queries';
import { IfoodLoja } from '@/presentation/ui/patterns/ifood-loja';
import { IfoodTabs } from '@/presentation/ui/patterns/ifood-tabs';
import { EmptyState } from '@/presentation/ui/primitives';
import { Store } from 'lucide-react';

export const metadata: Metadata = { title: 'iFood · Levô' };
export const dynamic = 'force-dynamic';

export default async function IfoodPage() {
  const loja = await getLojaIfood();

  if (!loja) {
    return (
      <EmptyState
        icon={Store}
        title="iFood não conectado"
        description="Conecte a loja ao iFood em Integrações para gerir pausa e horário por aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <IfoodTabs ativo="loja" />
      <IfoodLoja loja={loja} />
    </div>
  );
}
