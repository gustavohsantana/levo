import { describe, expect, it } from 'vitest';
import { Address, Money, Order } from '@/core';
import { PIZZARIA } from '../helpers/fixtures';

/**
 * Quem leva o pedido embora — a pergunta que decide se ele ocupa um motoboy da
 * casa.
 *
 * Eram duas respostas (nosso motoboy, ou o cliente). O 99Food trouxe a terceira:
 * o entregador da própria plataforma. Ela fica fora da rota pelo mesmo motivo da
 * retirada, e é por isso que a regra passou a perguntar `entraEmRota` em vez de
 * `isPickup` — perguntar pela retirada deixava o pedido do 99Food entrar na rota
 * de um motoboy que nunca iria buscá-lo.
 */
function pedido(fulfillment?: 'DELIVERY' | 'PICKUP' | 'PLATFORM') {
  return Order.create({
    id: 'pedido-1',
    establishmentId: PIZZARIA.id,
    source: fulfillment === 'PLATFORM' ? 'FOOD99' : 'SITE',
    customerName: 'Maria',
    address: Address.create('Rua das Flores, 10 - Centro, Pouso Alegre'),
    amount: Money.fromCents(4500),
    fulfillment,
  });
}

describe('quem leva o pedido', () => {
  it('entrega nossa é o padrão quando ninguém diz o contrário', () => {
    const p = pedido();

    expect(p.fulfillment).toBe('DELIVERY');
    expect(p.entraEmRota).toBe(true);
  });

  it('retirada fica fora da rota — quem busca é o cliente', () => {
    const p = pedido('PICKUP');

    expect(p.isPickup).toBe(true);
    expect(p.entraEmRota).toBe(false);
  });

  it('entrega da plataforma fica fora da rota — o motoboy não é nosso', () => {
    const p = pedido('PLATFORM');

    expect(p.isPlatformDelivery).toBe(true);
    expect(p.entraEmRota).toBe(false);
  });

  it('não confunde entrega da plataforma com retirada', () => {
    const plataforma = pedido('PLATFORM');
    const retirada = pedido('PICKUP');

    // Os dois ficam fora da rota, e é só isso que têm em comum: quem aparece no
    // balcão é diferente, e as telas dizem coisas diferentes por causa disso.
    expect(plataforma.isPickup).toBe(false);
    expect(retirada.isPlatformDelivery).toBe(false);
  });
});
