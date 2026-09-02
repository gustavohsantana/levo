import type { Metadata } from 'next';
import { getCouriers, getLojaNoMapa, getRotasNoMapa } from '@/presentation/queries';
import { Couriers } from '@/presentation/ui/patterns/couriers';

export const metadata: Metadata = { title: 'Entregadores · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadoresPage() {
  const [entregadores, loja, rotas] = await Promise.all([
    getCouriers(),
    getLojaNoMapa(),
    getRotasNoMapa(),
  ]);
  return <Couriers entregadores={entregadores} loja={loja} rotas={rotas} />;
}
