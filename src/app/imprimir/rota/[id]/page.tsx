import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';
import { getRotaParaImpressao } from '@/presentation/queries';
import { RotaPrint } from '@/presentation/ui/patterns/rota-print';

export const metadata: Metadata = { title: 'Imprimir rota · Levô' };
export const dynamic = 'force-dynamic';

/**
 * A folha da rota do motoboy — fora do painel, só o papel.
 *
 * Protegida como o resto: traz endereço e telefone de todos os clientes da
 * rota. Abre já no diálogo de impressão.
 */
export default async function ImprimirRotaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const rota = await getRotaParaImpressao(id);
  if (!rota) notFound();

  return <RotaPrint rota={rota} />;
}
