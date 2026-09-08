import type { Metadata } from 'next';
import { getCourierSession } from '@/presentation/http/courier-session';
import { CourierHardNav } from '@/presentation/ui/patterns/courier-hard-nav';
import { CourierLoginScreen } from '@/presentation/ui/patterns/courier-login-screen';

export const metadata: Metadata = { title: 'Entrar · Levô' };
export const dynamic = 'force-dynamic';

export default async function EntregadorLoginPage() {
  // O try fica só em volta da leitura: JSX dentro dele não seria pego por
  // catch nenhum — o React só renderiza o componente bem depois daqui.
  let jaEntrou = false;
  try {
    jaEntrou = Boolean(await getCourierSession());
  } catch {
    // Sessão ilegível é sessão que não existe: cai no formulário.
  }

  if (jaEntrou) return <CourierHardNav href="/entregador" label="Entrando…" />;

  return <CourierLoginScreen />;
}
