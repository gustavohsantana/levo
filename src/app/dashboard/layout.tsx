import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/presentation/http/session';
import { logoutAction } from '@/presentation/actions';
import { Button } from '@/presentation/ui/primitives';
import { Logo } from '@/presentation/ui/logo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-13 max-w-[1400px] items-center gap-3 px-5 py-2.5">
          <Link href="/dashboard">
            <Logo />
          </Link>

          <span className="text-ink-faint">/</span>
          <span className="text-sm text-ink-muted">{session.name}</span>

          <nav className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/catalogo">Catálogo</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/integracoes">Integrações</Link>
            </Button>
          </nav>

          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">{children}</main>
    </div>
  );
}
