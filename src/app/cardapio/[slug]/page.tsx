import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMenuPublico } from '@/presentation/public-menu';
import { PublicMenu } from '@/presentation/ui/patterns/public-menu';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getMenuPublico(slug);

  return {
    title: menu ? `${menu.establishment.name} · Cardápio` : 'Cardápio',
    description: menu ? `Peça direto com ${menu.establishment.name}.` : undefined,
  };
}

export default async function CardapioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await getMenuPublico(slug);

  if (!menu) notFound();

  return <PublicMenu menu={menu} />;
}
