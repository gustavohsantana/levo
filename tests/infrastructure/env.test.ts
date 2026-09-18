import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * O env é cacheado em módulo depois da primeira leitura, então cada caso
 * precisa de um registro limpo.
 */
async function loadEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();

  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const { env } = await import('@/env');
  return env();
}

const MINIMO = {
  DATABASE_URL: 'postgresql://levo:levo@localhost:5432/levo',
  AUTH_SECRET: 'a'.repeat(32),
};

describe('configuração de ambiente', () => {
  const backup = { ...process.env };

  afterEach(() => {
    process.env = { ...backup };
  });

  it('usa os defaults quando a variável opcional não existe', async () => {
    const env = await loadEnv({
      ...MINIMO,
      OSRM_BASE_URL: undefined,
      GEOCODER_BASE_URL: undefined,
      LOG_LEVEL: undefined,
    });

    expect(env.OSRM_BASE_URL).toBe('http://localhost:5000');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('trata campo em branco do painel de deploy como ausente', async () => {
    // A Vercel monta um campo para cada variável do .env.example. Salvar a
    // tela como veio grava "" — que não é undefined, então sem o filtro o
    // .default() não entra e o .url() derruba o boot.
    const env = await loadEnv({
      ...MINIMO,
      OSRM_BASE_URL: '',
      GEOCODER_BASE_URL: '',
      GEOCODER_API_KEY: '',
      IFOOD_ENABLED: '',
      LOG_LEVEL: '',
      WEBHOOK_SECRET: '',
    });

    expect(env.OSRM_BASE_URL).toBe('http://localhost:5000');
    expect(env.GEOCODER_BASE_URL).toBe('https://nominatim.openstreetmap.org');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.ifoodEnabled).toBe(false);
    expect(env.WEBHOOK_SECRET).toBeUndefined();
  });

  it('ainda recusa o que é de fato obrigatório', async () => {
    await expect(loadEnv({ ...MINIMO, DATABASE_URL: '' })).rejects.toThrow(/DATABASE_URL/);
  });

  it('ainda recusa AUTH_SECRET curto demais', async () => {
    await expect(loadEnv({ ...MINIMO, AUTH_SECRET: 'curto' })).rejects.toThrow(/AUTH_SECRET/);
  });

  it('liga o atalho do .env fora de produção', async () => {
    const env = await loadEnv({
      ...MINIMO,
      NODE_ENV: 'development',
      MERCADO_PAGO_CLIENT_ID: undefined,
      MERCADO_PAGO_CLIENT_SECRET: undefined,
      MERCADO_PAGO_PUBLIC_KEY: 'APP_USR-pk-prod',
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR-at-prod',
      MERCADO_PAGO_PUBLIC_KEY_TEST: undefined,
      MERCADO_PAGO_ACCESS_TOKEN_TEST: undefined,
    });

    expect(env.mercadoPagoEnabled).toBe(true);
    expect(env.mercadoPagoProdEnabled).toBe(true);
    expect(env.mercadoPagoOAuthEnabled).toBe(false);
  });

  /*
   * O par do `.env` é o token DA APLICAÇÃO: quem clicar recebe naquela conta,
   * não na dele. Com dois lojistas, os dois receberiam no mesmo lugar.
   *
   * A ação no servidor também recusa em produção, mas depender só disso deixou
   * na tela um botão que não funcionava — e escondeu o OAuth, que só aparece
   * quando o atalho não está disponível. O lojista ficou sem caminho nenhum.
   */
  it('esconde o atalho do .env em produção, deixando o OAuth aparecer', async () => {
    const env = await loadEnv({
      ...MINIMO,
      NODE_ENV: 'production',
      MERCADO_PAGO_CLIENT_ID: 'client-id',
      MERCADO_PAGO_CLIENT_SECRET: 'client-secret',
      MERCADO_PAGO_PUBLIC_KEY: 'APP_USR-pk-prod',
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR-at-prod',
      MERCADO_PAGO_PUBLIC_KEY_TEST: undefined,
      MERCADO_PAGO_ACCESS_TOKEN_TEST: undefined,
    });

    expect(env.mercadoPagoProdEnabled).toBe(false);
    expect(env.mercadoPagoOAuthEnabled).toBe(true);
    expect(env.mercadoPagoEnabled).toBe(true);
  });

  it('liga o Mercado Pago com o par de teste, sem Client Secret', async () => {
    // A aba de teste do painel só entrega Public Key + Access Token.
    const env = await loadEnv({
      ...MINIMO,
      NODE_ENV: 'development',
      MERCADO_PAGO_CLIENT_ID: undefined,
      MERCADO_PAGO_CLIENT_SECRET: undefined,
      MERCADO_PAGO_PUBLIC_KEY: undefined,
      MERCADO_PAGO_ACCESS_TOKEN: undefined,
      MERCADO_PAGO_PUBLIC_KEY_TEST: 'APP_USR-pk-teste',
      MERCADO_PAGO_ACCESS_TOKEN_TEST: 'APP_USR-at-teste',
    });

    expect(env.mercadoPagoEnabled).toBe(true);
    expect(env.mercadoPagoOAuthEnabled).toBe(false);
    expect(env.mercadoPagoTestEnabled).toBe(true);
  });

  it('não usa credencial de teste em produção', async () => {
    const env = await loadEnv({
      ...MINIMO,
      NODE_ENV: 'production',
      MERCADO_PAGO_CLIENT_ID: undefined,
      MERCADO_PAGO_CLIENT_SECRET: undefined,
      MERCADO_PAGO_PUBLIC_KEY: undefined,
      MERCADO_PAGO_ACCESS_TOKEN: undefined,
      MERCADO_PAGO_PUBLIC_KEY_TEST: 'APP_USR-pk-teste',
      MERCADO_PAGO_ACCESS_TOKEN_TEST: 'APP_USR-at-teste',
    });

    expect(env.mercadoPagoEnabled).toBe(false);
    expect(env.mercadoPagoTestEnabled).toBe(false);
  });

  it('liga o OAuth só com Client ID e Secret de produção', async () => {
    const env = await loadEnv({
      ...MINIMO,
      NODE_ENV: 'production',
      MERCADO_PAGO_CLIENT_ID: '3154098798706552',
      MERCADO_PAGO_CLIENT_SECRET: 'segredo-da-aplicacao',
      MERCADO_PAGO_PUBLIC_KEY: undefined,
      MERCADO_PAGO_ACCESS_TOKEN: undefined,
      MERCADO_PAGO_PUBLIC_KEY_TEST: undefined,
      MERCADO_PAGO_ACCESS_TOKEN_TEST: undefined,
    });

    expect(env.mercadoPagoOAuthEnabled).toBe(true);
    expect(env.mercadoPagoEnabled).toBe(true);
    expect(env.mercadoPagoTestEnabled).toBe(false);
  });

  it('WhatsApp só liga com a flag e o par de verificação', async () => {
    const env = await loadEnv({
      ...MINIMO,
      WHATSAPP_ENABLED: 'false',
      WHATSAPP_APP_SECRET: 'segredo',
      WHATSAPP_VERIFY_TOKEN: 'token',
    });

    expect(env.whatsappEnabled).toBe(false);
  });
});
