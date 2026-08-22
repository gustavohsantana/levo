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
});
