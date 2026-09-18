import Link from 'next/link';

/** Alterna entre as duas telas do iFood: a loja (Merchant) e o cardápio (Catalog). */
export function IfoodTabs({ ativo }: { ativo: 'loja' | 'cardapio' }) {
  const abas = [
    { chave: 'loja', rotulo: 'Loja', href: '/dashboard/ifood' },
    { chave: 'cardapio', rotulo: 'Cardápio', href: '/dashboard/ifood/catalogo' },
  ] as const;

  return (
    <nav className="flex gap-1 rounded-lg bg-raised p-1">
      {abas.map((a) => (
        <Link
          key={a.chave}
          href={a.href}
          aria-current={ativo === a.chave ? 'page' : undefined}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            ativo === a.chave ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
