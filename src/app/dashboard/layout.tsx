import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/presentation/http/session';
import { logoutAction } from '@/presentation/actions';
import { Button } from '@/presentation/ui/primitives';
import { Logo } from '@/presentation/ui/logo';
import { Sidebar } from '@/presentation/ui/patterns/sidebar';

/**
 * O painel com a navegação fixa à esquerda.
 *
 * Como o menu vive no layout, ele não é remontado ao trocar de tela — o que
 * muda é só a área de conteúdo. É o que faz o painel parecer um lugar só, em
 * vez de várias páginas se abrindo.
 *
 * Em telas estreitas a lateral vira uma faixa rolável no topo: coluna fixa num
 * celular comeria metade da largura útil.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b bg-accent-soft/35 lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-4 pt-4 max-lg:hidden">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>

        <Sidebar />

        <div className="px-4 pb-4 max-lg:hidden">
          <p className="truncate text-xs text-ink-faint">{session.name}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="-ml-2.5 mt-1">
              Sair
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Cabeçalho só no celular, onde a lateral não cabe com a marca e o sair. */}
        <header className="flex items-center gap-3 border-b px-5 py-2.5 lg:hidden">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <span className="ml-auto text-sm text-ink-muted">{session.name}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </header>

        <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
