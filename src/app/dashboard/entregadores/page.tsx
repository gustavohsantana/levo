import type { Metadata } from 'next';
import { getCouriers } from '@/presentation/queries';
import { Couriers } from '@/presentation/ui/patterns/couriers';

export const metadata: Metadata = { title: 'Entregadores · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadoresPage() {
  return <Couriers entregadores={await getCouriers()} />;
}
