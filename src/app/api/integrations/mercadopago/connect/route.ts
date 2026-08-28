import { NextResponse } from 'next/server';
import { ForbiddenError } from '@/core';
import { env } from '@/env';
import { mercadoPagoOAuth } from '@/infrastructure/payments/mercadopago/factory';
import { toErrorResponse } from '@/presentation/http/error-mapper';
import { issueOAuthState } from '@/presentation/http/oauth-state';
import { requireSession } from '@/presentation/http/session';

/**
 * Começo do consentimento: manda o dono ao Mercado Pago para autorizar.
 *
 * Exige sessão pelo mesmo motivo do aiqfome, e aqui a conta é mais alta: o token
 * que voltar autoriza **criar cobrança** no Mercado Pago de quem consentiu. Um
 * link solto ligaria a conta de um lojista ao estabelecimento de outro — e o
 * dinheiro de um cairia na conta do outro.
 */
export async function GET() {
  try {
    const session = await requireSession();

    if (!env().mercadoPagoOAuthEnabled) {
      throw new ForbiddenError('Pagamento pelo Mercado Pago não configurado neste ambiente');
    }

    const state = await issueOAuthState({
      establishmentId: session.establishmentId,
      provider: 'MERCADO_PAGO',
    });

    return NextResponse.redirect(mercadoPagoOAuth().buildAuthorizationUrl(state));
  } catch (cause) {
    return toErrorResponse(cause);
  }
}
