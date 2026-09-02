import type { Metadata } from 'next';
import { getCouriers, getLojaNoMapa } from '@/presentation/queries';
import { Couriers } from '@/presentation/ui/patterns/couriers';

export const metadata: Metadata = { title: 'Entregadores · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadoresPage() {
  const [entregadores, loja] = await Promise.all([getCouriers(), getLojaNoMapa()]);
  return <Couriers entregadores={entregadores} loja={loja} />;
}
