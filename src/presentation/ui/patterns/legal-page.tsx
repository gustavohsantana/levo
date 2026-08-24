import Link from 'next/link';
import { Logo } from '../logo';

/**
 * Moldura dos documentos legais.
 *
 * Coluna estreita e tipografia maior que a do produto: aqui o texto é o
 * conteúdo, não a interface. Sem plugin de tipografia — são duas páginas, e as
 * regras cabem no próprio componente.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-5">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-faint">Última atualização: {updatedAt}</p>

        <div
          className="mt-10 space-y-6 leading-relaxed text-ink-muted
            [&_a]:text-ink [&_a]:underline
            [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink
            [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink
            [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
        >
          {children}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-5 py-8 text-sm text-ink-faint">
          <Link href="/">Início</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Política de privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
