import { describe, expect, it } from 'vitest';
import { Address, Coordinates, InvalidCoordinatesError, Money, Token, ValidationError } from '@/core';

describe('Coordinates', () => {
  it('recusa valores fora do intervalo', () => {
    expect(() => Coordinates.create(91, 0)).toThrow(InvalidCoordinatesError);
    expect(() => Coordinates.create(0, 181)).toThrow(InvalidCoordinatesError);
    expect(() => Coordinates.create(Number.NaN, 0)).toThrow(InvalidCoordinatesError);
  });

  it('identifica coordenada fora do Brasil', () => {
    const curitiba = Coordinates.create(-25.4284, -49.2733);
    const lisboa = Coordinates.create(38.7223, -9.1393);

    expect(curitiba.isPlausibleForBrazil).toBe(true);
    expect(lisboa.isPlausibleForBrazil).toBe(false);
  });

  it('calcula distância em linha reta com precisão aceitável', () => {
    const curitiba = Coordinates.create(-25.4284, -49.2733);
    const saoPaulo = Coordinates.create(-23.5505, -46.6333);

    // ~339 km em linha reta. A faixa é larga de propósito: o teste checa que a
    // fórmula está certa em ordem de grandeza, não um valor de referência.
    const km = curitiba.distanceTo(saoPaulo) / 1000;
    expect(km).toBeGreaterThan(330);
    expect(km).toBeLessThan(345);
  });

  it('serializa para o OSRM na ordem lng,lat', () => {
    expect(Coordinates.create(-25.4284, -49.2733).toOsrm()).toBe('-49.2733,-25.4284');
  });
});

describe('Address', () => {
  it('gera a mesma chave de cache para grafias diferentes do mesmo lugar', () => {
    const a = Address.create('Av. Sete de Setembro, 1234 - Centro, Curitiba');
    const b = Address.create('AVENIDA SETE DE SETEMBRO 1234, CENTRO - CURITIBA');

    expect(a.cacheKey).toBe(b.cacheKey);
  });

  it('remove acentos da chave de cache', () => {
    expect(Address.create('Praça Osório, 100').cacheKey).toContain('osorio');
  });

  it('recusa endereço curto demais para ser localizado', () => {
    expect(() => Address.create('rua x')).toThrow(ValidationError);
  });
});

describe('Money', () => {
  it('guarda centavos e não perde precisão', () => {
    expect(Money.fromReais(49.9).cents).toBe(4990);
    expect(Money.fromReais(0.1).add(Money.fromReais(0.2)).cents).toBe(30);
  });

  it('recusa valor negativo', () => {
    expect(() => Money.fromCents(-1)).toThrow(ValidationError);
  });
});

describe('Token', () => {
  it('gera tokens únicos e no formato aceito', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => Token.generate().value));

    expect(tokens.size).toBe(500);
    for (const value of tokens) expect(() => Token.create(value)).not.toThrow();
  });

  it('recusa token malformado', () => {
    expect(() => Token.create('curto')).toThrow(ValidationError);
    expect(() => Token.create('com espaço aqui dentro')).toThrow(ValidationError);
  });
});
