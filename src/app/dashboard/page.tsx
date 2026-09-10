import type { Metadata } from 'next';
import { getCatalog, getDashboard } from '@/presentation/queries';
import { getAcertoDoDia } from '@/presentation/reports';
import { WorkQueue } from '@/presentation/ui/patterns/work-queue';
import { DayLedger } from '@/presentation/ui/patterns/day-ledger';
import { AcertoDoDia } from '@/presentation/ui/patterns/acerto-do-dia';
import { FinishedOrders } from '@/presentation/ui/patterns/finished-orders';
import { AutoRefresh } from '@/presentation/ui/patterns/auto-refresh';
import { PrimeirosPassos } from '@/presentation/ui/patterns/primeiros-passos';
import { deveMostrarRoteiro } from '@/core/services/primeiros-passos';

export const metadata: Metadata = { title: 'Painel · Levô' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [data, produtos, acerto] = await Promise.all([
    getDashboard(),
    getCatalog(),
    getAcertoDoDia(),
  ]);

  /*
   * Montado do que o painel já carregou, em vez de consulta nova: são quatro
   * contagens que já estão na mão, e a tela mais quente do produto não precisa
   * de mais uma ida ao banco para saber se a loja é novinha.
   */
  const loja = {
    produtos: produtos.length,
    motoboys: data.couriers.length,
    taxaConfigurada:
      data.establishment.deliveryFeeReais > 0 || data.establishment.feeBands.length > 0,
    pedidos: data.today.orders,
  };

  return (
    <>
      {/* Sem isto, pedido novo só aparecia com F5. */}
      <AutoRefresh segundos={10} />
      <div className="flex flex-col gap-7">
        {/*
          O dia inteiro numa linha, não em quatro cartões gigantes.
          Cartão de estatística ocupa a dobra com número que ninguém age em cima;
          o espaço nobre é da fila de trabalho, logo abaixo.
        */}
        <DayLedger establishmentName={data.establishment.name} today={data.today} />

        {/* O dinheiro do dia, ao lado dos números do dia. Some quando não há
            entrega ainda — no começo do turno o espaço é todo da fila. */}
        <AcertoDoDia acerto={acerto} />

      {/*
        Só para quem ainda não configurou o essencial.
        Depois disso some, porque lista de tarefas que fica para sempre vira
        decoração ocupando a dobra da tela mais usada do produto.
      */}
      {deveMostrarRoteiro(loja) ? <PrimeirosPassos loja={loja} /> : null}

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
    </>
  );
}
