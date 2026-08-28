import { PedidoPassos } from '@/presentation/ui/patterns/pedido-passos';

export default async function CardapioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <PedidoPassos slug={slug} />
      {children}
    </>
  );
}
