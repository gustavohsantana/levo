import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMenuPublico } from '@/presentation/public-menu';
import { PublicCheckout } from '@/presentation/ui/patterns/public-checkout';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getMenuPublico(slug);

  return {
    title: menu ? `Pedido · ${menu.establishment.name}` : 'Pedido',
  };
}

export default async function PedidoCardapioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const menu = await getMenuPublico(slug);
  if (!menu) notFound();

  return <PublicCheckout menu={menu} />;
}
