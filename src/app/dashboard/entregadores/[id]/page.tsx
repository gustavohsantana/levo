import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCourierMonth } from '@/presentation/queries';
import { acessoDoMotoboy } from '@/presentation/courier-login';
import { CourierAppAccess } from '@/presentation/ui/patterns/courier-app-access';
import { CourierMonth } from '@/presentation/ui/patterns/courier-month';
import { CourierPayForm } from '@/presentation/ui/patterns/courier-pay-form';
import { CourierTelegram } from '@/presentation/ui/patterns/courier-telegram';

export const metadata: Metadata = { title: 'Entregador · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { id } = await params;
  const { mes } = await searchParams;

  /*
   * O mês vem da URL para o navegador guardar onde o dono estava — voltar de
   * uma rota não pode jogá-lo de volta para o mês corrente.
   */
  const referencia = mesValido(mes) ?? mesAtual();
  const [ano, numero] = referencia.split('-').map(Number);

  const dados = await getCourierMonth(id, new Date(Date.UTC(ano, numero - 1, 1)));
  if (!dados.courier) notFound();
  const acesso = await acessoDoMotoboy(id);

  return (
    <div className="flex flex-col gap-6">
      <CourierMonth
        courier={dados.courier}
        mes={referencia}
        days={dados.days}
        routes={dados.routes}
      />

      <CourierAppAccess courierId={dados.courier.id} login={acesso.login} />

      {/*
        O acordo fica embaixo do mês, e não numa tela à parte: quem vem conferir
        quanto o motoboy rodou é quem vai acertar com ele.
      */}
      <CourierPayForm courierId={dados.courier.id} inicial={dados.acordo} />

      <CourierTelegram
        courierId={dados.courier.id}
        conectado={Boolean(dados.courier.telegramChatId)}
      />
    </div>
  );
}

/** `YYYY-MM` e nada mais: a data vem da URL, que qualquer um edita. */
function mesValido(valor: string | undefined): string | null {
  return valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? valor : null;
}

function mesAtual(): string {
  const agora = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());

  return agora.slice(0, 7);
}
