import { z } from 'zod';

/**
 * Configuração validada uma vez, no boot.
 *
 * Falhar aqui, na subida, é barato: a mensagem diz exatamente qual variável
 * está faltando. Falhar em `process.env.X!` no meio do sábado à noite é caro —
 * vira `undefined` viajando pelo código até estourar em algum lugar que não
 * tem nada a ver com a causa.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET precisa de ao menos 32 caracteres'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),

  OSRM_BASE_URL: z.string().url().default('http://localhost:5000'),

  GEOCODER_BASE_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
  GEOCODER_API_KEY: z.string().optional(),
  GEOCODER_USER_AGENT: z.string().default('levo-mvp'),

  IFOOD_ENABLED: z.enum(['true', 'false']).default('false'),
  IFOOD_CLIENT_ID: z.string().optional(),
  IFOOD_CLIENT_SECRET: z.string().optional(),
  IFOOD_MERCHANT_ID: z.string().optional(),

  AIQFOME_ENABLED: z.enum(['true', 'false']).default('false'),
  AIQFOME_API_KEY: z.string().optional(),
  AIQFOME_MERCHANT_ID: z.string().optional(),

  WEBHOOK_SECRET: z.string().optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function load() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração inválida:\n${problems}\n\nCopie .env.example para .env.`);
  }

  return {
    ...parsed.data,
    ifoodEnabled: parsed.data.IFOOD_ENABLED === 'true',
    aiqfomeEnabled: parsed.data.AIQFOME_ENABLED === 'true',
    isProduction: parsed.data.NODE_ENV === 'production',
  };
}

let cached: ReturnType<typeof load> | undefined;

export function env() {
  cached ??= load();
  return cached;
}
