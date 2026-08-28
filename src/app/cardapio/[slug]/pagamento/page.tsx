import { notFound } from 'next/navigation';
import { getMenuPublico, getPagamentoPublico } from '@/presentation/public-menu';
import { PagamentoPublico } from '@/presentation/ui/patterns/pagamento-publico';

export const dynamic = 'force-dynamic';

function primeiro(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

export default async function PagamentoCardapioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const menu = await getMenuPublico(slug);
  if (!menu) notFound();

  const orderId =
    primeiro(query.pedido) ?? primeiro(query.external_reference) ?? primeiro(query.orderId);
  const paymentId = primeiro(query.payment_id) ?? primeiro(query.collection_id);

  if (!orderId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="text-xl font-semibold text-ink">Pagamento não encontrado</h1>
        <p className="text-sm text-ink-muted">Volte ao cardápio e faça o pedido de novo.</p>
        <a href={`/cardapio/${slug}`} className="text-sm font-medium text-accent-ink underline">
          Abrir cardápio
        </a>
      </main>
    );
  }

  const pagamento = await getPagamentoPublico(slug, orderId);
  if (!pagamento) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="text-xl font-semibold text-ink">Pagamento não encontrado</h1>
        <p className="text-sm text-ink-muted">Volte ao pedido e tente de novo.</p>
        <a href={`/cardapio/${slug}/pedido`} className="text-sm font-medium text-accent-ink underline">
          Voltar ao pedido
        </a>
      </main>
    );
  }

  return (
    <PagamentoPublico
      slug={slug}
      orderId={orderId}
      paymentId={paymentId}
      nomeLoja={menu.establishment.name}
      inicial={pagamento}
    />
  );
}
