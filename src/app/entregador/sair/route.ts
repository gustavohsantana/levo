import { NextResponse } from 'next/server';
import { destroyCourierSession } from '@/presentation/http/courier-session';

/**
 * Sair, com o navegador fazendo a navegação.
 *
 * Aqui saía um HTML com `meta refresh` e `location.replace` — os dois pedindo
 * a navegação de dentro da página, que é justamente o que derruba o processo de
 * renderização do WebView Chromium 87 do tablet do piloto. O sintoma antigo,
 * "trava uns 10s e o app fecha", era essa queda.
 *
 * Um 303 devolve a navegação para quem já a estava fazendo.
 */
export async function GET(request: Request) {
  await destroyCourierSession();

  return NextResponse.redirect(new URL('/entregador', request.url), 303);
}
