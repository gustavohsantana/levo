import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourierSession } from '@/presentation/http/courier-session';
import { historicoDoDia, historicoRecente } from '@/presentation/courier-history';
import { hojeEmBrasilia } from '@/presentation/reports-core';
import { CourierHistoryScreen } from '@/presentation/ui/patterns/courier-history-screen';

export const metadata: Metadata = { title: 'Histórico · Levô' };
export const dynamic = 'force-dynamic';

const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/;

export default async function HistoricoDoMotoboyPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  // Sem sessão o histórico não existe: ganhos ficam atrás do login, não do link
  // da rota. `/entregador` mostra o login e traz de volta.
  const session = await getCourierSession();
  if (!session) redirect('/entregador');

  const hoje = hojeEmBrasilia();
  const pedido = (await searchParams).dia;
  // Só aceita data no formato certo, e nunca no futuro — o resto vira hoje.
  const dia = pedido && FORMATO_DIA.test(pedido) && pedido <= hoje ? pedido : hoje;

  const [resumo, recentes] = await Promise.all([historicoDoDia(dia), historicoRecente()]);

  return (
    <CourierHistoryScreen
      nome={session.name}
      dia={dia}
      hoje={hoje}
      resumo={resumo}
      recentes={recentes}
    />
  );
}
