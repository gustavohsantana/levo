import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Cifra simétrica para credencial de terceiro guardada no banco.
 *
 * Token de OAuth não é como hash de senha: o sistema precisa do valor original
 * para chamar a API do marketplace, então não dá para usar função de mão única.
 * O que dá para fazer é não guardar em claro — assim um dump de banco vazado,
 * sozinho, não vira acesso à conta do lojista no aiqfome.
 *
 * AES-256-GCM porque é autenticado: adulterar o texto cifrado faz o decifrar
 * falhar em vez de devolver lixo silenciosamente.
 *
 * A chave sai do `AUTH_SECRET` por SHA-256 — o mesmo segredo que assina a
 * sessão, derivado para um uso distinto. Trocar o `AUTH_SECRET` invalida as
 * credenciais guardadas e exige reautorizar; é o comportamento correto, e o
 * mesmo que já acontece com as sessões.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

export function encryptToken(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyFrom(secret), iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  // iv.tag.dados — tudo o que decifrar precisa, num campo só. O IV é novo a
  // cada chamada, então cifrar o mesmo token duas vezes não produz o mesmo
  // texto: sem isso, dava para saber que dois lojistas usam a mesma conta.
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptToken(payload: string, secret: string): string {
  const [iv, tag, data] = payload.split('.');
  if (!iv || !tag || !data) throw new Error('Credencial cifrada em formato inesperado');

  const decipher = createDecipheriv(ALGORITHM, keyFrom(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** O AES-256 quer exatamente 32 bytes; o `AUTH_SECRET` tem comprimento livre. */
function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}
