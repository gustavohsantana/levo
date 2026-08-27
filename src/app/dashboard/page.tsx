import type { Metadata } from 'next';
import { getCatalog, getDashboard } from '@/presentation/queries';
import { WorkQueue } from '@/presentation/ui/patterns/work-queue';
import { DayLedger } from '@/presentation/ui/patterns/day-ledger';
import { FinishedOrders } from '@/presentation/ui/patterns/finished-orders';

export const metadata: Metadata = { title: 'Painel · Levô' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [data, produtos] = await Promise.all([getDashboard(), getCatalog()]);

  return (
    <div className="flex flex-col gap-7">
      {/*
        O dia inteiro numa linha, não em quatro cartões gigantes.
        Cartão de estatística ocupa a dobra com número que ninguém age em cima;
        o espaço nobre é da fila de trabalho, logo abaixo.
      */}
      <DayLedger establishmentName={data.establishment.name} today={data.today} />

      <WorkQueue
        pending={data.pending}
        couriers={data.couriers}
        establishment={data.establishment}
        produtos={produtos}
        taxaPadraoReais={data.establishment.deliveryFeeReais}
        faixas={data.establishment.feeBands}
        rotasAtivas={data.activeRoutes}
      />

      {/* Por último e recolhido: consulta do turno, não fila de trabalho. */}
      <FinishedOrders orders={data.orders} />
    </div>
  );
}
