import type { Metadata } from 'next';
import { getLojaIfood } from '@/presentation/queries';
import { IfoodLoja } from '@/presentation/ui/patterns/ifood-loja';
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

  return <IfoodLoja loja={loja} />;
}
