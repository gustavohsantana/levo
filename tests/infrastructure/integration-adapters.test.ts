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
  /*
   * Campos conferidos contra o exemplo publicado em
   * developer.aiqfome.com/docs/api/v2/show-order.
   */
  const pedido = {
    id: 68635798,
    order_observations: '  sem cebola  ',
    user: {
      name: 'Vini001',
      surname: 'Test',
      mobile_phone: '(19) 9-9471-8672',
      address: {
        street: 'Rua das Palmeiras',
        number: 120,
        neighborhood: 'Centro',
        city: 'Pouso Alegre',
        complement: 'apto 42',
      },
    },
    payment_method: { total: '330.97' },
    timeline: { created_at: '2023-06-15 15:43:03', timezone: 'America/Sao_Paulo' },
  };

  it('mapeia o pedido da API V2', () => {
    const order = mapAiqfomeOrder(pedido);

    expect(order.externalId).toBe('68635798');
    expect(order.customerName).toBe('Vini001 Test');
    expect(order.customerPhone).toBe('(19) 9-9471-8672');
    expect(order.address).toBe('Rua das Palmeiras, 120 - Centro - Pouso Alegre');
    expect(order.reference).toBe('apto 42');
    expect(order.notes).toBe('sem cebola');
  });

  it('converte o total em centavos sem erro de ponto flutuante', () => {
    // 330.97 * 100 dá 33096.999... em binário: sem arredondar, some um centavo.
    expect(mapAiqfomeOrder(pedido).amountCents).toBe(33_097);
  });

  it('lê a data no fuso da loja, não no do servidor', () => {
    // O servidor roda em UTC. Sem converter, um pedido das 15:43 apareceria
    // às 18:43 no painel — plausível o bastante para ninguém desconfiar.
    expect(mapAiqfomeOrder(pedido).placedAt.toISOString()).toBe('2023-06-15T18:43:03.000Z');
  });

  it('respeita o fuso informado quando não é o de São Paulo', () => {
    const order = mapAiqfomeOrder({
      ...pedido,
      timeline: { created_at: '2023-06-15 15:43:03', timezone: 'America/Fortaleza' },
    });

    expect(order.placedAt.toISOString()).toBe('2023-06-15T18:43:03.000Z');
  });

  it('aceita endereço já formatado', () => {
    const order = mapAiqfomeOrder({
      ...pedido,
      user: { ...pedido.user, address: 'Rua Um, 2 - Centro - Pouso Alegre' },
    });

    expect(order.address).toBe('Rua Um, 2 - Centro - Pouso Alegre');
    expect(order.reference).toBeNull();
  });

  it('sobrevive a um pedido sem cliente nem endereço', () => {
    const order = mapAiqfomeOrder({ id: 9 });

    expect(order.customerName).toBe('Cliente aiqfome');
    expect(order.customerPhone).toBeNull();
    expect(order.address).toBe('');
    expect(order.amountCents).toBe(0);
    expect(order.placedAt).toBeInstanceOf(Date);
  });
});
