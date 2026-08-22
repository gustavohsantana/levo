import { NextResponse } from 'next/server';
import { NotFoundError } from '@/core';
import { getTrackingSnapshot } from '@/presentation/driver-queries';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/** Consultado a cada 10s pela página pública do cliente. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const snapshot = await getTrackingSnapshot(token);
    if (!snapshot) throw new NotFoundError('Pedido', token);

    return NextResponse.json(snapshot, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
}
