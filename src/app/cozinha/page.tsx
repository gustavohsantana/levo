import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';
import { getCozinha } from '@/presentation/queries';
import { KitchenBoard } from '@/presentation/ui/patterns/kitchen-board';

export const metadata: Metadata = { title: 'Cozinha · Levô' };
export const dynamic = 'force-dynamic';

/**
 * A tela do tablet da cozinha.
 *
 * Fora de `/dashboard` de propósito: o painel tem barra lateral com Relatórios,
 * Integrações e Configurações, e nada disso deveria estar ao alcance de um
 * tablet preso na parede que qualquer um encosta. Aqui só existe a fila e um
 * botão por pedido.
 */
export default async function CozinhaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return <KitchenBoard pedidos={await getCozinha()} />;
}
