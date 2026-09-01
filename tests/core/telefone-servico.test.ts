import { describe, expect, it } from 'vitest';
import { PhoneNumber } from '@/core';

/**
 * O iFood manda `0800 700 3020` como contato do cliente.
 *
 * A regra do "zero de operadora" — que existe para `041 9999...` virar
 * `41 9999...` — comia o zero e transformava o 0800 em DDD 80. Na tela do
 * pedido aparecia `(80) 0700-3020`: um número que ninguém disca, justamente
 * onde o dono liga para o cliente.
 */
describe('número de serviço', () => {
  it('preserva o zero e formata sem DDD', () => {
    const t = PhoneNumber.create('0800 700 3020');

    expect(t.value).toBe('08007003020');
    expect(t.formatted).toBe('0800 700 3020');
  });

  it('não oferece WhatsApp — 0800 não tem', () => {
    expect(PhoneNumber.create('0800 700 3020').whatsapp).toBeNull();
    expect(PhoneNumber.create('0800 700 3020').isMobile).toBe(false);
  });

  it('celular comum continua intacto', () => {
    const t = PhoneNumber.create('(35) 98888-0001');

    expect(t.formatted).toBe('(35) 98888-0001');
    expect(t.whatsapp).toBe('5535988880001');
  });

  it('o zero de operadora de DDD continua sendo removido', () => {
    expect(PhoneNumber.create('035 98888-0001').value).toBe('35988880001');
  });
});
