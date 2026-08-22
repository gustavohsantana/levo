import { describe, expect, it } from 'vitest';
import { InvalidPhoneError, PhoneNumber } from '@/core';

describe('PhoneNumber', () => {
  it('normaliza as formas que um humano digita com pressa', () => {
    const forms = [
      '(41) 99999-9999',
      '41999999999',
      '+55 41 99999-9999',
      '55 (41) 99999 9999',
      '041 99999-9999',
      '  41 9 9999 9999  ',
    ];

    for (const raw of forms) {
      expect(PhoneNumber.create(raw).whatsapp).toBe('5541999999999');
    }
  });

  it('aceita telefone fixo de 10 dígitos', () => {
    const phone = PhoneNumber.create('(41) 3333-4444');

    expect(phone.isMobile).toBe(false);
    expect(phone.whatsapp).toBe('554133334444');
    expect(phone.formatted).toBe('(41) 3333-4444');
  });

  it('formata celular para exibição', () => {
    expect(PhoneNumber.create('41999998888').formatted).toBe('(41) 99999-8888');
  });

  it('trata o zero de operadora como prefixo, não como DDD', () => {
    // "0" + DDD 19 + fixo de 8 dígitos: o zero é descartado, sobra Campinas.
    expect(PhoneNumber.create('01999999999').ddd).toBe('19');
  });

  it('recusa DDD inexistente', () => {
    expect(() => PhoneNumber.create('(10) 99999-9999')).toThrow(InvalidPhoneError);
    expect(() => PhoneNumber.create('(00) 99999-9999')).toThrow(InvalidPhoneError);
  });

  it('recusa celular de 11 dígitos sem o nono dígito 9', () => {
    // (41) 88888-8888 não existe desde a migração para o nono dígito.
    expect(() => PhoneNumber.create('41888888888')).toThrow(InvalidPhoneError);
  });

  it('recusa número curto ou vazio', () => {
    for (const raw of ['', '   ', '9999', '4199999']) {
      expect(() => PhoneNumber.create(raw)).toThrow(InvalidPhoneError);
    }
  });

  it('tryCreate devolve null em vez de explodir', () => {
    expect(PhoneNumber.tryCreate('lixo')).toBeNull();
    expect(PhoneNumber.tryCreate('41999999999')).toBeInstanceOf(PhoneNumber);
  });
});
