'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Play } from 'lucide-react';
import { startRouteAction } from '@/presentation/actions';
import { Button } from '../primitives';

export function StartRouteButton({ routeId }: { routeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      variant="primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await startRouteAction(routeId);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Play />}
      Saiu para entrega
    </Button>
  );
}
