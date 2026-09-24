import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourierSession } from '@/presentation/http/courier-session';
import { historicoDeHoje } from '@/presentation/driver-queries';
import { rotaAtualDoMotoboy } from '@/presentation/courier-login';
import { CourierLoginScreen } from '@/presentation/ui/patterns/courier-login-screen';
import { CourierWaiting } from '@/presentation/ui/patterns/courier-waiting';

export const metadata: Metadata = { title: 'Minha rota · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadorHomePage() {
  const session = await sessaoDoMotoboy();
  if (!session) return <CourierLoginScreen />;

  const rota = await rotaDoMotoboy();

  /*
   * Redirecionamento da rede, e nao salto da pagina.
   *
   * Quem manda o WebView para outro lugar aqui e o servidor, num 307 que o
   * proprio carregamento segue. A versao anterior desenhava uma tela e mandava
   * ela se substituir — e era ai que o renderizador do Chromium 87 morria, sem
   * chegar a pedir /m/. Menos codigo, e um passo a menos para dar errado.
   */
  if (rota) redirect(`/m/${rota.accessToken}`);

  const historico = await historicoDeHoje(session.establishmentId, session.courierId).catch(
    () => null,
  );

  return <CourierWaiting nome={session.name} historico={historico} />;
}

async function sessaoDoMotoboy() {
  try {
    return await getCourierSession();
  } catch {
    return null;
  }
}

async function rotaDoMotoboy() {
  try {
    return await rotaAtualDoMotoboy();
  } catch {
    return null;
  }
}
