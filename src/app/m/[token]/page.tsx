import type { Metadata, Viewport } from 'next';
import { getDriverRoute, historicoDeHojePeloToken } from '@/presentation/driver-queries';
import { CourierApp, CourierEmpty } from '@/presentation/ui/patterns/courier-app';

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
  const [route, historico] = await Promise.all([
    getDriverRoute(token),
    historicoDeHojePeloToken(token).catch(() => null),
  ]);

  if (!route) return <CourierEmpty />;

  return (
    <CourierApp
      token={token}
      route={route}
      exigeCodigo={route.exigeCodigo}
      historico={historico}
    />
  );
}
