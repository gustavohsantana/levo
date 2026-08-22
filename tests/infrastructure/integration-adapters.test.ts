import { describe, expect, it } from 'vitest';
import { mapIfoodOrder } from '@/infrastructure/integrations/ifood/adapter';
import { mapAiqfomeOrder } from '@/infrastructure/integrations/aiqfome/adapter';
import { Address, PhoneNumber } from '@/core';

/**
 * O risco real dos adapters está no mapeamento, não na chamada HTTP.
 *
 * Como não dá para homologar sem CNPJ, estes testes fixam o contrato que
 * entendemos da documentação: quando a integração for ligada de verdade, é aqui
 * que a divergência aparece primeiro — com uma mensagem clara, e não com um
 * pedido chegando torto no baú do motoboy.
 */

describe('mapIfoodOrder', () => {
  it('usa o endereço já formatado quando ele vem', () => {
    const order = mapIfoodOrder(
      {
        id: 'IF-1',
        customer: { name: 'Maria Silva', phone: { number: '41999998888' } },
        delivery: {
          deliveryAddress: {
            formattedAddress: 'Rua Trajano Reis, 300 - São Francisco, Curitiba',
            complement: 'Apto 42',
          },
        },
        total: { orderAmount: 89.9 },
        observations: 'Sem cebola',
      },
      'fallback',
      '2026-08-22T22:00:00Z',
    );

    expect(order.externalId).toBe('IF-1');
    expect(order.address).toBe('Rua Trajano Reis, 300 - São Francisco, Curitiba');
    expect(order.reference).toBe('Apto 42');
    expect(order.amountCents).toBe(8990);
    expect(order.notes).toBe('Sem cebola');
    expect(order.placedAt).toEqual(new Date('2026-08-22T22:00:00Z'));
  });

  it('remonta o endereço a partir dos campos separados', () => {
    const order = mapIfoodOrder(
      {
        id: 'IF-2',
        delivery: {
          deliveryAddress: {
            streetName: 'Av. Sete de Setembro',
            streetNumber: '4200',
            neighborhood: 'Batel',
            city: 'Curitiba',
          },
        },
      },
      'fallback',
      '2026-08-22T22:00:00Z',
    );

    expect(order.address).toBe('Av. Sete de Setembro, 4200 - Batel - Curitiba');
    // E o resultado precisa ser aceito pelo domínio, não só parecer certo.
    expect(() => Address.create(order.address)).not.toThrow();
  });

  it('converte reais em centavos sem deixar float passar', () => {
    const order = mapIfoodOrder(
      { id: 'IF-3', total: { orderAmount: 0.1 + 0.2 } },
      'fallback',
      '2026-08-22T22:00:00Z',
    );

    expect(order.amountCents).toBe(30);
  });

  it('sobrevive a payload mínimo sem nenhum campo opcional', () => {
    const order = mapIfoodOrder({ id: 'IF-4' }, 'fallback', '2026-08-22T22:00:00Z');

    expect(order.customerName).toBe('Cliente iFood');
    expect(order.customerPhone).toBeNull();
    expect(order.amountCents).toBe(0);
  });

  it('cai no id do evento quando o pedido não traz o próprio', () => {
    const order = mapIfoodOrder({} as { id: string }, 'evento-99', '2026-08-22T22:00:00Z');

    expect(order.externalId).toBe('evento-99');
  });

  it('entrega telefone que o domínio consegue normalizar', () => {
    const order = mapIfoodOrder(
      { id: 'IF-5', customer: { phone: { number: '(41) 99999-8888' } } },
      'fallback',
      '2026-08-22T22:00:00Z',
    );

    expect(PhoneNumber.create(order.customerPhone!).whatsapp).toBe('5541999998888');
  });
});

describe('mapAiqfomeOrder', () => {
  it('mapeia os campos em português', () => {
    const order = mapAiqfomeOrder({
      id: 4711,
      cliente: { nome: 'Carlos Prado', telefone: '41988887777' },
      entrega: {
        logradouro: 'Rua Itupava',
        numero: '900',
        bairro: 'Alto da Rua XV',
        cidade: 'Curitiba',
        complemento: 'Casa dos fundos',
      },
      valor_total: 74.5,
      observacao: 'Deixar na portaria',
      criado_em: '2026-08-22T22:10:00Z',
    });

    expect(order.externalId).toBe('4711'); // id numérico vira texto
    expect(order.address).toBe('Rua Itupava, 900 - Alto da Rua XV - Curitiba');
    expect(order.reference).toBe('Casa dos fundos');
    expect(order.amountCents).toBe(7450);
    expect(order.notes).toBe('Deixar na portaria');
  });

  it('prefere o endereço formatado quando disponível', () => {
    const order = mapAiqfomeOrder({
      id: '1',
      entrega: { endereco: 'Av. Iguaçu, 2200 - Água Verde, Curitiba', logradouro: 'ignorado' },
    });

    expect(order.address).toBe('Av. Iguaçu, 2200 - Água Verde, Curitiba');
  });

  it('sobrevive a payload mínimo', () => {
    const order = mapAiqfomeOrder({ id: 9 });

    expect(order.customerName).toBe('Cliente aiqfome');
    expect(order.amountCents).toBe(0);
    expect(order.placedAt).toBeInstanceOf(Date);
  });
});
