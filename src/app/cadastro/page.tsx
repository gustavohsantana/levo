import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';
import { SignupForm } from '@/presentation/ui/patterns/signup-form';
import { LogoMark } from '@/presentation/ui/logo';

export const metadata: Metadata = { title: 'Criar conta · Levô' };

export default async function CadastroPage() {
  // Quem já está dentro não vê tela de cadastro.
  if (await getSession()) redirect('/dashboard');

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoMark className="mb-5 size-9 text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Comece a usar o Levô</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Em um minuto sua loja está no ar, com cardápio e link para mandar no WhatsApp.
          </p>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-ink-muted">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-ink hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
