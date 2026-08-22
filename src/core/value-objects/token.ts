import { ValidationError } from '../errors';

const BYTES = 16;

/**
 * Token opaco usado nos links sem senha (rota do motoboy, rastreio do cliente).
 *
 * Esses links circulam por WhatsApp e são a única credencial de quem os recebe,
 * então precisam ser imprevisíveis: 128 bits de `crypto.getRandomValues`.
 * `Math.random()` aqui seria enumerável — daria para adivinhar a rota alheia.
 *
 * Usa Web Crypto (padrão da plataforma, presente em Node 22, browser e edge),
 * não `node:crypto` — o domínio não pode depender de um runtime específico.
 */
export class Token {
  private constructor(readonly value: string) {}

  static generate(): Token {
    const bytes = new Uint8Array(BYTES);
    globalThis.crypto.getRandomValues(bytes);
    return new Token(base64url(bytes));
  }

  static create(value: string): Token {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(value ?? '')) {
      throw new ValidationError('Token inválido');
    }
    return new Token(value);
  }

  toString(): string {
    return this.value;
  }

  toJSON() {
    return this.value;
  }
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
