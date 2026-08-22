import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getRoute } from '@/presentation/queries';
import { Button } from '@/presentation/ui/primitives';
import { RouteMonitor } from '@/presentation/ui/patterns/route-monitor';

export const metadata: Metadata = { title: 'Rota · Girô' };
export const dynamic = 'force-dynamic';

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRoute(id);

  if (!data) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 self-start">
        <Link href="/dashboard">
          <ArrowLeft />
          Voltar ao painel
        </Link>
      </Button>

      <RouteMonitor
        route={data.route}
        establishment={data.establishment}
        trail={data.trail}
      />
    </div>
  );
}
