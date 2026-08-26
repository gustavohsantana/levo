import type { Metadata } from 'next';
import { currentContainer } from '@/presentation/queries';
import { Settings } from '@/presentation/ui/patterns/settings';

export const metadata: Metadata = { title: 'Configurações · Levô' };
export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  const { container } = await currentContainer();

  const establishment = await container.read(async (repos) => {
    const atual = await repos.establishments.current();
    return {
      name: atual.name,
      address: atual.address.raw,
      city: atual.city,
      state: atual.state,
    };
  });

  return <Settings establishment={establishment} />;
}
