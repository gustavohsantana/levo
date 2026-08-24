import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { ForbiddenError } from '@/core';
import { env } from '@/env';

/**
 * O `state` do OAuth, que é a defesa contra CSRF no consentimento.
 *
 * Sem ele, qualquer um poderia induzir o dono logado a abrir a URL de callback
 * com um `code` obtido na *própria* conta do atacante — e o Levô passaria a
 * importar pedidos de uma conta alheia achando que o lojista autorizou a dele.
 *
 * Defesa em duas partes, porque cada uma cobre um furo da outra:
 *
 *  1. **JWT assinado** com o `AUTH_SECRET`, carregando o estabelecimento e um
 *     prazo curto. Garante que o state saiu daqui e ainda vale.
 *  2. **Nonce repetido num cookie** (*double submit*). Só a assinatura não
 *     bastaria: um state legítimo, capturado do histórico do navegador ou de um
 *     `Referer`, seria reutilizável dentro da validade. O cookie é `httpOnly` e
 *     morre no uso, então o state só fecha no navegador que o abriu.
 */
const COOKIE = 'levo_oauth_state';
const TTL_SECONDS = 60 * 10; // consentir leva minutos, não horas

interface StatePayload {
  establishmentId: string;
  provider: string;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export async function issueOAuthState(payload: StatePayload): Promise<string> {
  const nonce = globalThis.crypto.randomUUID();

  const state = await new SignJWT({ ...payload, nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, nonce, {
    httpOnly: true,
    // `lax` e não `strict`: o cookie precisa sobreviver ao retorno vindo do
    // domínio do marketplace, que é navegação de topo entre sites. Com
    // `strict` o cookie não é enviado no callback e todo consentimento falha.
    sameSite: 'lax',
    secure: env().isProduction,
    path: '/',
    maxAge: TTL_SECONDS,
  });

  return state;
}

/**
 * Consome o state. Lança `ForbiddenError` se algo não bate — e nunca diz o quê:
 * quem está tentando forjar não precisa de pista sobre qual etapa falhou.
 */
export async function consumeOAuthState(
  state: string | null,
  provider: string,
): Promise<StatePayload> {
  const jar = await cookies();
  const nonce = jar.get(COOKIE)?.value;

  // Um só uso, dê no que der: mesmo em falha o cookie sai, para não deixar
  // nonce válido para uma segunda tentativa.
  jar.delete(COOKIE);

  if (!state || !nonce) throw new ForbiddenError('Autorização inválida');

  try {
    const { payload } = await jwtVerify(state, secret());

    if (payload.nonce !== nonce) throw new ForbiddenError('Autorização inválida');
    if (payload.provider !== provider) throw new ForbiddenError('Autorização inválida');

    return {
      establishmentId: String(payload.establishmentId),
      provider: String(payload.provider),
    };
  } catch {
    throw new ForbiddenError('Autorização inválida');
  }
}
