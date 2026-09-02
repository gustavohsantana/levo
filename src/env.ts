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
   * Aplicação do Levô em "Suas integrações". O painel chama as credenciais de
   * produção de Public Key + Access Token — esses nomes, esse par. A aba de
   * teste entrega o mesmo par, de uma conta sandbox. Sem `_ENABLED` de
   * propósito: ter o par no ambiente *é* estar ligado.
   *
   * Client ID + Client Secret só entram se o painel mostrar esse segundo par
   * (OAuth de lojista). Não são o "secret de produção".
   */
  MERCADO_PAGO_CLIENT_ID: z.string().optional(),
  MERCADO_PAGO_CLIENT_SECRET: z.string().optional(),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_PUBLIC_KEY_TEST: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN_TEST: z.string().optional(),
  /** Segredo gerado em Suas integrações → Webhooks → Configurar notificações. */
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional(),

  /** Vem do Vercel Blob quando a loja de imagens está ligada ao projeto. */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  WEBHOOK_SECRET: z.string().optional(),
  /*
   * WAHA: a ponte com o WhatsApp que manda a rota para o motoboy.
   *
   * Fica só no worker. A Vercel é serverless e não alcançaria a WAHA, que roda
   * presa no localhost da VM — e é assim que deve ser: quem tem a chave manda
   * mensagem pelo WhatsApp da loja.
   */
  /*
   * Telegram: o canal automático que o motoboy autoriza uma vez.
   *
   * Diferente da WAHA, isto roda na Vercel — a API é pública e não precisa de
   * ponte nenhuma.
   */
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  /** Confere que o webhook veio do Telegram, e não de quem achou o endereço. */
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  WAHA_URL: z.string().optional(),
  WAHA_API_KEY: z.string().optional(),
  WAHA_SESSION: z.string().default('default'),

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

  const mercadoPagoOAuthEnabled = Boolean(
    parsed.data.MERCADO_PAGO_CLIENT_ID && parsed.data.MERCADO_PAGO_CLIENT_SECRET,
  );
  /*
   * O par do `.env` é atalho de desenvolvimento, produção ou teste — a aba do
   * painel do Mercado Pago separa as chaves, não a natureza da coisa. Nos dois
   * casos o token é o DA APLICAÇÃO: quem clicar recebe naquela conta, não na
   * dele. Com dois lojistas, os dois receberiam no mesmo lugar.
   *
   * Some em produção junto com o de teste. A ação no servidor também recusa,
   * mas depender só disso deixava na tela um botão que não funciona — e
   * escondia o OAuth, que é o caminho certo, porque ele só aparecia quando
   * este aqui não estava disponível.
   */
  const mercadoPagoProdEnabled =
    parsed.data.NODE_ENV !== 'production' &&
    Boolean(parsed.data.MERCADO_PAGO_PUBLIC_KEY && parsed.data.MERCADO_PAGO_ACCESS_TOKEN);
  const mercadoPagoTestEnabled =
    parsed.data.NODE_ENV !== 'production' &&
    Boolean(parsed.data.MERCADO_PAGO_PUBLIC_KEY_TEST && parsed.data.MERCADO_PAGO_ACCESS_TOKEN_TEST);

  return {
    ...parsed.data,
    ifoodEnabled: parsed.data.IFOOD_ENABLED === 'true',
    aiqfomeEnabled: parsed.data.AIQFOME_ENABLED === 'true',
    /*
     * Produção, no painel, é Public Key + Access Token. Teste é o mesmo par
     * da aba sandbox. OAuth (Client ID + Secret) é outro fluxo, se o painel
     * algum dia mostrar esse par.
     */
    mercadoPagoOAuthEnabled,
    mercadoPagoProdEnabled,
    mercadoPagoTestEnabled,
    mercadoPagoEnabled: mercadoPagoOAuthEnabled || mercadoPagoProdEnabled || mercadoPagoTestEnabled,
    isProduction: parsed.data.NODE_ENV === 'production',
  };
}

let cached: ReturnType<typeof load> | undefined;

export function env() {
  cached ??= load();
  return cached;
}
