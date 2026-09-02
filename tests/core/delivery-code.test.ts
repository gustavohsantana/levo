import { describe, expect, it } from 'vitest';
import { conferirCodigoDeEntrega, gerarCodigoDeEntrega } from '@/core/services/delivery-code';
import { ValidationError } from '@/core';

/**
 * O código de confirmação de entrega.
 *
 * Ele decide se uma entrega pode ser fechada. Errar para o lado rígido deixa o
 * motoboy preso no portão do cliente; errar para o lado frouxo devolve o
 * problema que ele existe para resolver.
 */
describe('gerar', () => {
  it('sempre quatro dígitos, inclusive quando sorteia baixo', () => {
    // Sem o padStart, 7 viraria "7" e o cliente leria um código de um dígito.
    expect(gerarCodigoDeEntrega(() => 0.0007)).toBe('0007');
    expect(gerarCodigoDeEntrega(() => 0)).toBe('0000');
    expect(gerarCodigoDeEntrega(() => 0.9999)).toHaveLength(4);
  });
});

describe('conferir', () => {
  it('aceita o código certo', () => {
    expect(() => conferirCodigoDeEntrega('1234', '1234')).not.toThrow();
  });

  it('ignora espaço e traço que o motoboy digitou', () => {
    // O cliente lê "12 34"; recusar por causa disso é transformar acerto em erro.
    expect(() => conferirCodigoDeEntrega('1234', '12 34')).not.toThrow();
    expect(() => conferirCodigoDeEntrega('1234', '12-34')).not.toThrow();
  });

  it('recusa o código errado', () => {
    expect(() => conferirCodigoDeEntrega('1234', '4321')).toThrow(ValidationError);
  });

  it('recusa o vazio com um pedido claro, não com "código incorreto"', () => {
    // Quem não digitou nada precisa saber que falta pedir, não que errou.
    expect(() => conferirCodigoDeEntrega('1234', '')).toThrow(/Peça ao cliente/);
    expect(() => conferirCodigoDeEntrega('1234', null)).toThrow(/Peça ao cliente/);
  });

  it('deixa passar pedido que nunca teve código', () => {
    /*
     * Pedidos anteriores ao recurso não têm código. Bloqueá-los deixaria o
     * motoboy parado no portão sem saída nenhuma.
     */
    expect(() => conferirCodigoDeEntrega(null, null)).not.toThrow();
    expect(() => conferirCodigoDeEntrega(null, '9999')).not.toThrow();
  });
});
