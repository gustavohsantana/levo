import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCourierMonth } from '@/presentation/queries';
import { CourierMonth } from '@/presentation/ui/patterns/courier-month';

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

  return (
    <CourierMonth
      courier={dados.courier}
      mes={referencia}
      days={dados.days}
      routes={dados.routes}
    />
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
