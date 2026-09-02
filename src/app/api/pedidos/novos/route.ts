import { NextResponse } from 'next/server';
import { getSession } from '@/presentation/http/session';
import { getPedidosNovos } from '@/presentation/queries';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/**
 * A fila de pedidos novos, para o sino da barra lateral.
 *
 * Existe como endereço próprio em vez de sair do `router.refresh()` porque o
 * sino vive em toda tela do painel. Recarregar a rota inteira a cada dez
 * segundos refaria o catálogo enquanto o dono edita um produto, ou os
 * relatórios enquanto ele lê um número — para saber uma coisa que cabe em
 * poucas linhas de JSON.
 */
export async function GET() {
  try {
    const session = await getSession();
    // Sem sessão não é erro: é a aba que ficou aberta e o cookie expirou.
    if (!session) return NextResponse.json({ pedidos: [] }, { status: 200 });

    return NextResponse.json(
      { pedidos: await getPedidosNovos(session.establishmentId) },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (cause) {
    return toErrorResponse(cause);
  }
}
