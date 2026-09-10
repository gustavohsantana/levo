import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';
import { getPedidoParaImpressao } from '@/presentation/queries';
import { ComandaCupomPrint } from '@/presentation/ui/patterns/comanda-cupom-print';

export const metadata: Metadata = { title: 'Imprimir pedido · Levô' };
export const dynamic = 'force-dynamic';

/**
 * A folha de impressão de um pedido — fora do painel de propósito.
 *
 * Sem barra lateral nem cabeçalho: a página abre já no diálogo de impressão e
 * some. Protegida como o resto do painel, porque traz o endereço e o telefone
 * do cliente.
 */
export default async function ImprimirPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const dados = await getPedidoParaImpressao(id);
  if (!dados) notFound();

  return <ComandaCupomPrint loja={dados.loja} pedido={dados.pedido} />;
}
