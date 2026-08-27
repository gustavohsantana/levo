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

  // Consentimento OAuth do aiqfome. Os endereços são configuráveis porque quem
  // os fixa é o credenciamento (API V2 / ID Magalu); o `redirect_uri` não entra
  // aqui de propósito — sai do PUBLIC_BASE_URL, para não divergir do cadastro.
  AIQFOME_CLIENT_ID: z.string().optional(),
  AIQFOME_CLIENT_SECRET: z.string().optional(),
  AIQFOME_AUTH_URL: z.string().url().optional(),
  AIQFOME_TOKEN_URL: z.string().url().optional(),
  AIQFOME_SCOPE: z.string().optional(),
  AIQFOME_BASE_URL: z.string().url().optional(),

  /*
   * Aplicação do Levô em "Suas integrações", no painel de developers do Mercado
   * Pago. Uma só, para todos os estabelecimentos: o que separa uma loja da outra
   * é o token que **ela** autoriza, guardado no `IntegrationCredential`.
   *
   * Sem `_ENABLED` de propósito, ao contrário do iFood e do aiqfome. Aqueles
   * têm polling que precisa ser desligado; aqui não há processo nenhum rodando,
   * e uma variável a mais só criaria o estado em que a credencial existe e a
   * integração está desligada — sem ninguém saber por quê.
   */
  MERCADO_PAGO_CLIENT_ID: z.string().optional(),
  MERCADO_PAGO_CLIENT_SECRET: z.string().optional(),

  /** Vem do Vercel Blob quando a loja de imagens está ligada ao projeto. */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  WEBHOOK_SECRET: z.string().optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function load() {
  /**
   * Painel de deploy grava campo não preenchido como string vazia, não como
   * ausente — e `""` não é `undefined`, então `.default()` não entra e um
   * `.url()` estoura no boot. A Vercel monta um campo para cada variável do
   * .env.example, então salvar a tela como veio derrubaria a aplicação com
   * "Invalid URL" numa variável que era opcional.
   */
  const source = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== ''),
  );

  const parsed = schema.safeParse(source);

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
    // Ter a credencial da aplicação *é* estar ligado. Ver o comentário no schema.
    mercadoPagoEnabled: Boolean(
      parsed.data.MERCADO_PAGO_CLIENT_ID && parsed.data.MERCADO_PAGO_CLIENT_SECRET,
    ),
    isProduction: parsed.data.NODE_ENV === 'production',
  };
}

let cached: ReturnType<typeof load> | undefined;

export function env() {
  cached ??= load();
  return cached;
}
