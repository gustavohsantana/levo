import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';
import { getLojaNoMapa, getRotasNoMapa } from '@/presentation/queries';
import { CouriersMap } from '@/presentation/ui/patterns/couriers-map';
import { AutoRefresh } from '@/presentation/ui/patterns/auto-refresh';

export const metadata: Metadata = { title: 'Mapa dos entregadores · Levô' };
export const dynamic = 'force-dynamic';

/**
 * O mapa sozinho, em tela cheia.
 *
 * Fora de `/dashboard` de propósito: o painel tem barra lateral fixa, e um mapa
 * "em tela cheia" dentro dela não seria cheio. Esta página existe para ficar
 * aberta numa aba de lado no sábado à noite, e quem deixa isso aberto quer
 * olhar de longe — não navegar.
 */
export default async function MapaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [rotas, loja] = await Promise.all([getRotasNoMapa(), getLojaNoMapa()]);

  if (!loja) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="text-sm text-ink-muted">
          Cadastre o endereço da loja em Configurações para ver o mapa.
        </p>
      </main>
    );
  }

  return (
    <>
      <AutoRefresh segundos={10} />
      <CouriersMap rotas={rotas} loja={loja} cheia />
    </>
  );
}
