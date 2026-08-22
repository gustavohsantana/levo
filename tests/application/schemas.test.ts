import { describe, expect, it } from 'vitest';
import { brlAmount, createOrderSchema } from '@/application/dto/schemas';

describe('valor em reais', () => {
  it('aceita as formas que um brasileiro digita', () => {
    const casos: Array<[string, number]> = [
      ['45,50', 45.5],
      ['45.50', 45.5],
      ['1.234,56', 1234.56],
      ['R$ 89,90', 89.9],
      ['100', 100],
      ['', 0],
      ['  67,00  ', 67],
    ];

    for (const [entrada, esperado] of casos) {
      expect(brlAmount.parse(entrada), `entrada: "${entrada}"`).toBeCloseTo(esperado, 2);
    }
  });

  it('recusa valor negativo', () => {
    expect(() => brlAmount.parse('-10')).toThrow();
  });

  it('o formulário de pedido aceita vírgula decimal', () => {
    const parsed = createOrderSchema.parse({
      customerName: 'Maria Silva',
      address: 'Rua Trajano Reis, 300 - Curitiba',
      amountReais: '89,90',
    });

    expect(parsed.amountReais).toBeCloseTo(89.9, 2);
  });

  it('o formulário funciona sem valor informado', () => {
    const parsed = createOrderSchema.parse({
      customerName: 'Maria Silva',
      address: 'Rua Trajano Reis, 300 - Curitiba',
      amountReais: '',
    });

    expect(parsed.amountReais).toBe(0);
  });
});
