import { createHmac, timingSafeEqual } from 'node:crypto';
import { ForbiddenError } from '@/core';

/**
 * Valida o `x-signature` do Mercado Pago.
 *
 * Diferente do iFood (HMAC do corpo cru). Aqui o manifest é montado a partir de
 * query params e headers — errar um `;` faz toda assinatura falhar.
 */
export function verifyMercadoPagoWebhookSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): void {
  const { xSignature, xRequestId, dataId, secret } = input;

  if (!xSignature) throw new ForbiddenError('Assinatura ausente');

  const parts = Object.fromEntries(
    xSignature.split(',').map((chunk) => {
      const trimmed = chunk.trim();
      const eq = trimmed.indexOf('=');
      if (eq === -1) return [trimmed, ''];
      return [trimmed.slice(0, eq), trimmed.slice(eq + 1)];
    }),
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) throw new ForbiddenError('Assinatura incompleta');

  const manifest = buildManifest(dataId, xRequestId, ts);
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ForbiddenError('Assinatura inválida');
  }
}

function buildManifest(dataId: string | null, requestId: string | null, ts: string): string {
  const chunks: string[] = [];

  if (dataId) chunks.push(`id:${dataId.toLowerCase()}`);
  if (requestId) chunks.push(`request-id:${requestId}`);
  chunks.push(`ts:${ts}`);

  return `${chunks.join(';')};`;
}
