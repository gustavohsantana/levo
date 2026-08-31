import { describe, expect, it } from 'vitest';
import { mapIfoodOrder } from '@/infrastructure/integrations/ifood/adapter';

/**
 * O pedido do iFood tem três níveis: item, complemento e customização do
 * complemento. Este payload é o do ambiente de homologação deles, recortado —
 * é o caso mais difícil que a plataforma monta de propósito, para provar que o
 * parceiro aguenta combo com opcional aninhado.
 *
 * Durante meses o adapter leu sete campos e descartou o resto: o dono via
 * quanto custou e para onde ia, sem saber o que preparar.
 */
const pedido = {
  id: '00491194-e93b-4ffe-af2b-8b8ca29e7b31',
  customer: { name: 'Cliente', phone: { number: '0800 700 3020' } },
  delivery: { deliveryAddress: { formattedAddress: 'Rua TESTE, 999999' } },
  total: { orderAmount: 27 },
  payments: { methods: [{ method: 'CREDIT', type: 'ONLINE', prepaid: true }] },
  items: [
    { name: 'PRODUTO 1', quantity: 1, unitPrice: 5, totalPrice: 5, options: [] },
    {
      name: 'PRODUTO 2 (COMBO)',
      quantity: 1,
      unitPrice: 5,
      totalPrice: 16,
      options: [
        { name: 'Complemento 1' },
        { name: 'Complemento 2' },
        {
          name: 'Complemento 4',
          customizations: [{ name: 'Customização 1' }, { name: 'Customização 2' }],
        },
      ],
    },
  ],
};

describe('mapIfoodOrder — itens', () => {
  it('traz uma linha por item', () => {
    const r = mapIfoodOrder(pedido, 'fb', '2026-08-31T14:44:11.353Z');

    expect(r.items).toHaveLength(2);
    expect(r.items?.[0]).toMatchObject({ name: 'PRODUTO 1', quantity: 1, unitPriceCents: 500 });
  });

  it('põe complementos e customizações no nome, não em linhas próprias', () => {
    const r = mapIfoodOrder(pedido, 'fb', '2026-08-31T14:44:11.353Z');

    expect(r.items?.[1].name).toBe(
      'PRODUTO 2 (COMBO) (Complemento 1, Complemento 2, Complemento 4, Customização 1, Customização 2)',
    );
    // O preço da linha já inclui os complementos: 5 do item + 8 + 3.
    expect(r.items?.[1].unitPriceCents).toBe(1600);
  });

  it('fecha a conta no centavo — taxa é a diferença até o total da plataforma', () => {
    const r = mapIfoodOrder(pedido, 'fb', '2026-08-31T14:44:11.353Z');

    const soma = r.items!.reduce((t, i) => t + i.unitPriceCents * i.quantity, 0);
    expect(soma).toBe(2100);
    // 27,00 do iFood − 21,00 de itens = 6,00 (entrega 5 + taxa adicional 1).
    expect(r.deliveryFeeCents).toBe(600);
    expect(soma + r.deliveryFeeCents!).toBe(r.amountCents);
  });

  it('pré-pago vira ONLINE — não há o que receber na porta', () => {
    const r = mapIfoodOrder(pedido, 'fb', '2026-08-31T14:44:11.353Z');

    expect(r.paymentMethod).toBe('ONLINE');
  });

  it('dinheiro na porta mantém o meio, porque o motoboy precisa saber', () => {
    const r = mapIfoodOrder(
      { ...pedido, payments: { methods: [{ method: 'CASH', type: 'OFFLINE', prepaid: false }] } },
      'fb',
      '2026-08-31T14:44:11.353Z',
    );

    expect(r.paymentMethod).toBe('CASH');
  });

  it('pedido sem itens não inventa taxa — o total segue sendo o da plataforma', () => {
    const r = mapIfoodOrder(
      { ...pedido, items: [] },
      'fb',
      '2026-08-31T14:44:11.353Z',
    );

    expect(r.items).toBeUndefined();
    expect(r.deliveryFeeCents).toBeUndefined();
    expect(r.amountCents).toBe(2700);
  });

  it('desconto maior que as taxas não produz taxa negativa', () => {
    const r = mapIfoodOrder(
      { ...pedido, total: { orderAmount: 18 } },
      'fb',
      '2026-08-31T14:44:11.353Z',
    );

    expect(r.deliveryFeeCents).toBe(0);
  });
});
