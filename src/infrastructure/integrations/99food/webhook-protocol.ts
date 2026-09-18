import { createHash, timingSafeEqual } from 'node:crypto';
import JSONbig from 'json-bigint';

/**
 * O protocolo do webhook do 99Food: assinatura e leitura do corpo.
 *
 * Separado da rota porque estas duas regras são as que a homologação cobra e as
 * que quebram em silêncio — merecem existir sozinhas, testáveis, longe do
 * roteamento do Next.
 */

/**
 * Leitor de JSON que **não corrompe inteiro grande**.
 *
 * `app_id`, `order_id` e `shop_id` são long de 64 bits. O `JSON.parse` do Node
 * guarda número em double, e double só tem 53 bits de mantissa: o pedido
 * 5764607801871631353 vira 5764607801871631000 — silenciosamente, sem erro.
 * Depois disso, confirmar o pedido responde "não existe" e ninguém entende por
 * quê. O próprio 99Food avisa disso na documentação, e parsear certo é item
 * obrigatório da homologação.
 *
 * `storeAsString` devolve esses números como string, que é exatamente como o
 * resto do Levô já trata id externo (`externalOrderId` é `String`).
 */
const leitor = JSONbig({ storeAsString: true });

/** O corpo do evento, já com os ids preservados como string. */
export interface EventoFood99 {
  /** ID do app na plataforma deles. String para não perder precisão. */
  app_id?: string;
  /** ID da loja no NOSSO sistema — fomos nós que definimos. */
  app_shop_id?: string;
  /** Tipo do evento, ex.: `orderNew`. Novos tipos podem surgir. */
  type?: string;
  timestamp?: number;
  /** Conteúdo específico do tipo. Pode vir como objeto ou como string JSON. */
  data?: unknown;
}

/**
 * Lê o corpo cru preservando os ids grandes.
 *
 * Recebe o texto, e não o `Request`, porque quem chama precisa do mesmo texto
 * para conferir a assinatura — ler o corpo duas vezes de um `Request` não é
 * possível.
 */
export function lerEvento(raw: string): EventoFood99 {
  return leitor.parse(raw) as EventoFood99;
}

/**
 * `data` às vezes chega como objeto, às vezes como string JSON — a própria
 * documentação diz "json or string". Quem consome não deveria ter que saber.
 */
export function dadosDoEvento(evento: EventoFood99): unknown {
  const { data } = evento;
  if (typeof data !== 'string') return data;
  try {
    return leitor.parse(data);
  } catch {
    // String que não é JSON é um dado legítimo para alguns tipos de evento.
    return data;
  }
}

/**
 * Confere que quem chamou foi mesmo o 99Food.
 *
 * O esquema deles é `MD5(corpo_cru + app_secret)` no header `didi-header-sign`.
 * Duas exigências que não dá para contornar:
 *
 * - **O corpo tem que ser o cru.** Reserializar depois de um parse muda espaço
 *   e ordem de chave, e a assinatura passa a falhar sempre — por um motivo que
 *   não aparece no log.
 * - **A comparação tem que ser em tempo constante.** `===` vaza, pelo tempo de
 *   resposta, quantos caracteres iniciais bateram, e isso permite forjar a
 *   assinatura byte a byte.
 *
 * MD5 não é escolha nossa — é o que a plataforma define. Ele aqui só prova
 * origem, e o segredo nunca viaja.
 */
export function assinaturaConfere(
  raw: string,
  recebida: string | null,
  appSecret: string,
): boolean {
  if (!recebida) return false;

  const esperada = createHash('md5').update(raw + appSecret, 'utf8').digest('hex');
  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(recebida.trim().toLowerCase(), 'utf8');

  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A resposta que o 99Food espera. Qualquer coisa diferente de `errno: 0` faz
 * ele reenviar o mesmo evento várias vezes — inclusive um 200 com corpo vazio.
 */
export const RESPOSTA_OK = { errno: 0, errmsg: 'ok' } as const;

export function respostaDeErro(mensagem: string) {
  return { errno: 1, errmsg: mensagem };
}
