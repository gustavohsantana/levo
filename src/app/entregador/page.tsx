import type { Metadata } from 'next';
import { getCourierSession } from '@/presentation/http/courier-session';
import { rotaAtualDoMotoboy } from '@/presentation/courier-login';
import { CourierHardNav } from '@/presentation/ui/patterns/courier-hard-nav';
import { CourierLoginScreen } from '@/presentation/ui/patterns/courier-login-screen';
import { CourierWaiting } from '@/presentation/ui/patterns/courier-waiting';

export const metadata: Metadata = { title: 'Minha rota · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadorHomePage() {
  const session = await sessaoDoMotoboy();
  if (!session) return <CourierLoginScreen />;

  const rota = await rotaDoMotoboy();
  if (rota) {
    return <CourierHardNav href={`/m/${rota.accessToken}`} label="Abrindo sua rota…" />;
  }

  return <CourierWaiting nome={session.name} />;
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
