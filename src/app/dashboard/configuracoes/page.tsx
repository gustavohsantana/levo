import type { Metadata } from 'next';
import { env } from '@/env';
import { currentContainer } from '@/presentation/queries';
import { Settings } from '@/presentation/ui/patterns/settings';

export const metadata: Metadata = { title: 'Configurações · Levô' };
export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  const { container } = await currentContainer();

  const { establishment, faixas } = await container.read(async (repos) => {
    const atual = await repos.establishments.current();
    const bands = await repos.establishments.deliveryFeeBands();
    return {
      faixas: bands.map((b) => ({ km: b.uptoMeters / 1000, reais: b.fee.reais })),
      establishment: {
      name: atual.name,
      address: atual.address.raw,
      city: atual.city,
      state: atual.state,
      deliveryFeeReais: atual.deliveryFee.reais,
      slug: atual.slug,
      autoConfirmOrders: atual.autoConfirmOrders,
      whatsappRoutes: atual.whatsappRoutes,
      baseUrl: env().PUBLIC_BASE_URL,
      },
    };
  });

  return <Settings establishment={establishment} faixas={faixas} />;
}
