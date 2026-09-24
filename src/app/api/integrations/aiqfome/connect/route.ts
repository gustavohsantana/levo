import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { aiqfomeOAuth } from '@/infrastructure/integrations/aiqfome/factory';
import { aiqfomePronto } from '@/presentation/integracao-disponivel';
import { toErrorResponse } from '@/presentation/http/error-mapper';
import { issueOAuthState } from '@/presentation/http/oauth-state';
import { requireSession } from '@/presentation/http/session';

/**
 * Começo do consentimento: manda o dono ao aiqfome para autorizar.
 *
 * Exige sessão porque o token que voltar será gravado **no estabelecimento
 * dele** — sem isso, um link solto conectaria a conta de um lojista ao
 * estabelecimento de outro.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    /*
     * Sem credencial, o dono não sai do painel para um JSON. Volta para
     * Integrações, onde o cartão já explica o que falta — o mesmo recado do
     * 99Food e do iFood.
     */
    if (!aiqfomePronto(env())) {
      return NextResponse.redirect(new URL('/dashboard/integracoes', request.nextUrl.origin));
    }

    const state = await issueOAuthState({
      establishmentId: session.establishmentId,
      provider: 'AIQFOME',
    });

    return NextResponse.redirect(aiqfomeOAuth().buildAuthorizationUrl(state));
  } catch (cause) {
    return toErrorResponse(cause);
  }
}
