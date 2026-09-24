import { NextResponse } from 'next/server';
import { NotFoundError } from '@/core';
import { getDriverRoute } from '@/presentation/driver-queries';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/**
 * A rota do motoboy em JSON — o mesmo dado que a página `/m/{token}` renderiza.
 *
 * Existe para o app nativo (e qualquer outro cliente) não ter que raspar o
 * payload RSC da página do navegador: o formato do flight stream muda com o
 * Next e a raspagem quebra em silêncio. Aqui o contrato é explícito e estável.
 *
 * Sem sessão: o token da rota é a credencial, igual ao resto da tela do motoboy.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const route = await getDriverRoute(token);
    if (!route) throw new NotFoundError('Rota', token);

    return NextResponse.json(route, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (cause) {
    return toErrorResponse(cause);
  }
}
