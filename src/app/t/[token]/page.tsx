import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTrackingSnapshot } from '@/presentation/driver-queries';
import { TrackingView } from '@/presentation/ui/patterns/tracking-view';

export const metadata: Metadata = {
  title: 'Acompanhe sua entrega',
  // A página é um link privado circulando por WhatsApp: não deve ser indexada.
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // `true`: carregar a página É a abertura do link. A sondagem que vem
  // depois não conta — ver GetTrackingSnapshot.
  const snapshot = await getTrackingSnapshot(token, true);

  if (!snapshot) notFound();

  return <TrackingView token={token} initial={snapshot} />;
}
