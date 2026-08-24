import { NextResponse } from 'next/server';
import { ForbiddenError } from '@/core';
import { env } from '@/env';
import { aiqfomeOAuth } from '@/infrastructure/integrations/aiqfome/factory';
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
export async function GET() {
  try {
    const session = await requireSession();

    if (!env().aiqfomeEnabled) {
      throw new ForbiddenError('Integração com o aiqfome desligada');
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
