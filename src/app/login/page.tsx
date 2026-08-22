import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';
import { LoginForm } from '@/presentation/ui/patterns/login-form';

export const metadata: Metadata = { title: 'Entrar · Levô' };

export default async function LoginPage() {
  if (await getSession()) redirect('/dashboard');

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-5 inline-flex size-9 items-center justify-center rounded-md bg-accent text-accent-ink">
            <span className="text-lg font-semibold">L</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Levô</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Rotas inteligentes para quem entrega com motoboy próprio.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
