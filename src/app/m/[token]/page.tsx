import type { Metadata, Viewport } from 'next';
import { getDriverRoute } from '@/presentation/driver-queries';
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
  const route = await getDriverRoute(token);

  /*
   * Link vencido não é 404, é uma tela.
   *
   * O `notFound()` que estava aqui caía no 404 embutido do Next: fundo branco,
   * letra miúda, em inglês. No navegador isso já era ruim; dentro do app
   * Android, que guarda o token do último turno e reabre por ele todo dia, é a
   * tela que o motoboy encontra na manhã seguinte — e o que ele vê é o app
   * "abrindo em branco". `CourierEmpty` já existia para este caso, escrita e
   * nunca ligada.
   */
  if (!route) return <CourierEmpty />;

  return <CourierApp token={token} route={route} exigeCodigo={route.exigeCodigo} />;
}
