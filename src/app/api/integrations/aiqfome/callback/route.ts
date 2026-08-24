import { NextResponse } from 'next/server';
import { env } from '@/env';
import { aiqfomeOAuth } from '@/infrastructure/integrations/aiqfome/factory';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { toErrorResponse } from '@/presentation/http/error-mapper';
import { consumeOAuthState } from '@/presentation/http/oauth-state';

/**
 * Retorno do consentimento do aiqfome — o `redirect_uri` cadastrado no portal
 * do parceiro. O endereço é derivado do `PUBLIC_BASE_URL` (ver `factory`), para
 * que ambiente e cadastro nunca divirjam.
 *
 * Quem chega aqui é o **navegador do lojista**, não um servidor: por isso o
 * final é sempre um redirecionamento para uma tela, com o resultado na query, e
 * não um JSON que ele veria como texto cru.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // O provedor sinaliza recusa com `error`, sem `code`. Recusar não é falha
    // do sistema: o lojista pode ter clicado em "não autorizar".
    const denied = url.searchParams.get('error');
    if (denied) return backToPanel('recusado');

    const { establishmentId } = await consumeOAuthState(
      url.searchParams.get('state'),
      'AIQFOME',
    );

    const code = url.searchParams.get('code');
    if (!code) return backToPanel('sem-codigo');

    const tokens = await aiqfomeOAuth().exchangeCode(code);

    // Cifra, `upsert` e renovação vivem no store — um caminho só para gravar
    // credencial, compartilhado com o iFood.
    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);
    await store.save(establishmentId, 'AIQFOME', tokens);

    return backToPanel('conectado');
  } catch (cause) {
    return toErrorResponse(cause);
  }
}

function backToPanel(result: string): NextResponse {
  const target = new URL('/dashboard', env().PUBLIC_BASE_URL);
  target.searchParams.set('aiqfome', result);
  return NextResponse.redirect(target);
}
