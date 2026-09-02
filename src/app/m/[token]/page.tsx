import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { getDriverRoute } from '@/presentation/driver-queries';
import { CourierApp } from '@/presentation/ui/patterns/courier-app';

export const metadata: Metadata = { title: 'Minha rota · Levô' };
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#1a1917',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function CourierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const route = await getDriverRoute(token);

  if (!route) notFound();

  return <CourierApp token={token} route={route} exigeCodigo={route.exigeCodigo} />;
}
