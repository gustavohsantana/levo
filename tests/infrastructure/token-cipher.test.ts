import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from '@/infrastructure/security/token-cipher';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

describe('token-cipher', () => {
  it('decifra de volta o valor original', () => {
    const token = 'ya29.a0AfB_byC-token-de-acesso';
    expect(decryptToken(encryptToken(token, SECRET), SECRET)).toBe(token);
  });

  it('não guarda o token em claro', () => {
    expect(encryptToken('token-secreto', SECRET)).not.toContain('token-secreto');
  });

  it('cifra o mesmo valor em textos diferentes a cada vez', () => {
    // IV novo por chamada: sem isso, dava para deduzir que dois estabelecimentos
    // usam a mesma conta só comparando as linhas do banco.
    const a = encryptToken('mesmo-token', SECRET);
    const b = encryptToken('mesmo-token', SECRET);

    expect(a).not.toBe(b);
    expect(decryptToken(a, SECRET)).toBe(decryptToken(b, SECRET));
  });

  it('recusa texto cifrado adulterado em vez de devolver lixo', () => {
    const payload = encryptToken('token-secreto', SECRET);
    const [iv, tag, data] = payload.split('.');
    const mexido = `${iv}.${tag}.${data.slice(0, -4)}AAAA`;

    expect(() => decryptToken(mexido, SECRET)).toThrow();
  });

  it('recusa credencial cifrada com outro segredo', () => {
    const payload = encryptToken('token-secreto', SECRET);
    expect(() => decryptToken(payload, 'outro-segredo-de-32-caracteres-ou-mais!')).toThrow();
  });

  it('recusa formato inesperado sem estourar erro obscuro', () => {
    expect(() => decryptToken('nao-e-um-payload', SECRET)).toThrow(/formato inesperado/i);
  });
});
