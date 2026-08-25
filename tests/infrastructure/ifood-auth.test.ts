import { afterEach, describe, expect, it, vi } from 'vitest';
import { IfoodAuth } from '@/infrastructure/integrations/ifood/auth';

/**
 * A validade do token do iFood não é a que ele diz que é.
 *
 * A resposta traz `expiresIn: 21600`, mas o `exp` de dentro do JWT vence três
 * horas antes — e é o `exp` que o servidor faz valer. O worker acreditou no
 * `expiresIn` e ficou horas apanhando `401 token expired` sem renovar.
 */
function jwtComExp(exp: number): string {
  const corpo = Buffer.from(JSON.stringify({ exp, iat: exp - 21_600 })).toString('base64url');
  return `cabecalho.${corpo}.assinatura`;
}

function respondeToken(accessToken: string, expiresIn: number) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ accessToken, refreshToken: 'refresh-abc', expiresIn }),
  })) as unknown as typeof fetch;
}

const auth = new IfoodAuth({ clientId: 'cliente', clientSecret: 'segredo' });

const trocar = () =>
  auth.exchangeAuthorizationCode({
    authorizationCode: 'ABCD-EFGH',
    authorizationCodeVerifier: 'verifier',
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('IfoodAuth: validade do token', () => {
  it('usa o exp do JWT quando ele vence antes do expiresIn', async () => {
    const agora = new Date('2026-08-24T17:59:02.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    // O caso real: 21600 s declarados, mas o exp cai três horas antes disso.
    const exp = Math.floor(agora.getTime() / 1000) + 10_800;
    vi.stubGlobal('fetch', respondeToken(jwtComExp(exp), 21_600));

    const tokens = await trocar();

    expect(tokens.expiresAt.toISOString()).toBe('2026-08-24T20:59:02.000Z');
  });

  it('não estica a validade quando o exp vem depois do expiresIn', async () => {
    const agora = new Date('2026-08-24T17:59:02.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    const exp = Math.floor(agora.getTime() / 1000) + 86_400;
    vi.stubGlobal('fetch', respondeToken(jwtComExp(exp), 21_600));

    const tokens = await trocar();

    // Entre os dois prazos vale o que vencer primeiro: renovar cedo custa uma
    // chamada, renovar tarde custa pedidos.
    expect(tokens.expiresAt.toISOString()).toBe('2026-08-24T23:59:02.000Z');
  });

  it('cai para o expiresIn quando o token não é um JWT', async () => {
    const agora = new Date('2026-08-24T17:59:02.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    vi.stubGlobal('fetch', respondeToken('token-opaco-sem-pontos', 21_600));

    const tokens = await trocar();

    expect(tokens.expiresAt.toISOString()).toBe('2026-08-24T23:59:02.000Z');
  });

  it('cai para o expiresIn quando o corpo do JWT é ilegível', async () => {
    const agora = new Date('2026-08-24T17:59:02.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    vi.stubGlobal('fetch', respondeToken('cabecalho.nao-e-json.assinatura', 21_600));

    const tokens = await trocar();

    expect(tokens.expiresAt.toISOString()).toBe('2026-08-24T23:59:02.000Z');
  });
});
