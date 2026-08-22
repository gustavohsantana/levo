import type { Metadata } from 'next';
import { getDashboard } from '@/presentation/queries';
import { WorkQueue } from '@/presentation/ui/patterns/work-queue';
import { ActiveRoutes } from '@/presentation/ui/patterns/active-routes';
import { DayLedger } from '@/presentation/ui/patterns/day-ledger';

export const metadata: Metadata = { title: 'Painel · Girô' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboard();

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
      />

      <ActiveRoutes routes={data.activeRoutes} />
    </div>
  );
}
