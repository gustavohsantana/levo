import { NextResponse } from 'next/server';
import { env } from '@/env';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { lerContaMercadoPago } from '@/infrastructure/payments/mercadopago/account';
import { mercadoPagoOAuth } from '@/infrastructure/payments/mercadopago/factory';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { toErrorResponse } from '@/presentation/http/error-mapper';
import { consumeOAuthState } from '@/presentation/http/oauth-state';

/**
 * Retorno do consentimento do Mercado Pago — o `redirect_uri` cadastrado em
 * "Suas integrações". O endereço é derivado do `PUBLIC_BASE_URL` (ver
 * `factory`), para que ambiente e cadastro nunca divirjam.
 *
 * Quem chega aqui é o **navegador do lojista**, não um servidor: por isso o
 * final é sempre um redirecionamento para uma tela, com o resultado na query, e
 * não um JSON que ele veria como texto cru.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // Recusar não é falha do sistema: o lojista pode ter clicado em "não
    // autorizar", ou desistido na tela de login.
    const denied = url.searchParams.get('error');
    if (denied) return backToPanel('recusado');

    const { establishmentId } = await consumeOAuthState(
      url.searchParams.get('state'),
      'MERCADO_PAGO',
    );

    const code = url.searchParams.get('code');
    if (!code) return backToPanel('sem-codigo');

    const tokens = await mercadoPagoOAuth().exchangeCode(code);

    /*
     * Quem é a conta que acabou de autorizar.
     *
     * Serve para duas coisas, e a segunda é a que evita o suporte: guardar o
     * `user_id` como `merchantId` — é quem vai receber o dinheiro — e mostrar
     * nome e e-mail na tela, para o lojista que tem conta pessoal e conta da
     * empresa perceber sozinho que conectou a errada.
     */
    const conta = await lerContaMercadoPago(tokens.accessToken);

    /*
     * Conta sem Pix habilitado é recusada aqui, e não na hora do pedido.
     *
     * Deixar passar significaria uma loja que aparece conectada e cuja primeira
     * cobrança falha com `Collector user without key enabled for QR render` —
     * na tela do cliente, num sábado, com a cozinha cheia. O lojista resolve em
     * um minuto no aplicativo do Mercado Pago; só precisa saber disso agora.
     *
     * `null` passa: significa que a consulta não respondeu, não que a conta é
     * incapaz. Recusar por desconhecimento seria barrar quem funcionaria.
     */
    if (conta?.aceitaPix === false) return backToPanel('sem-chave-pix');

    // Cifra, `upsert` e renovação vivem no store — um caminho só para gravar
    // credencial, compartilhado com iFood e aiqfome.
    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);
    await store.save(establishmentId, 'MERCADO_PAGO', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      publicKey: tokens.publicKey,
      liveMode: tokens.liveMode,
      merchantId: conta?.id ?? tokens.merchantId,
    });

    return backToPanel(tokens.liveMode ? 'conectado' : 'conectado-em-teste');
  } catch (cause) {
    return toErrorResponse(cause);
  }
}

function backToPanel(result: string): NextResponse {
  const target = new URL('/dashboard/integracoes', env().PUBLIC_BASE_URL);
  target.searchParams.set('mercadopago', result);
  return NextResponse.redirect(target);
}
