import { describe, expect, it } from 'vitest';
import { WhatsAppLinkBuilder } from '@/infrastructure/messaging/whatsapp-link-builder';
import { Address, Money, Order, PhoneNumber } from '@/core';

function orderWith(phone: string | null) {
  return Order.create({
    id: 'order-1',
    establishmentId: 'est-1',
    source: 'MANUAL',
    customerName: 'Maria Silva Souza',
    customerPhone: phone ? PhoneNumber.create(phone) : null,
    address: Address.create('Rua XV de Novembro, 100 - Centro'),
    amount: Money.fromReais(58.9),
  });
}

describe('WhatsAppLinkBuilder', () => {
  const builder = new WhatsAppLinkBuilder('https://giro.app/');

  it('monta link wa.me com telefone normalizado e mensagem pronta', () => {
    const order = orderWith('(41) 99999-9999');

    const link = builder.dispatchLink(order, 'Pizzaria do Zé')!;
    const url = new URL(link);

    expect(url.origin + url.pathname).toBe('https://wa.me/5541999999999');
    const text = url.searchParams.get('text')!;
    expect(text).toContain('Oi, Maria!');
    expect(text).toContain('Pizzaria do Zé');
    expect(text).toContain(`https://giro.app/t/${order.trackingToken.value}`);
  });

  it('trata a barra final da URL base sem duplicar', () => {
    expect(builder.trackingUrl(orderWith(null))).not.toContain('//t/');
  });

  it('devolve null quando o pedido não tem telefone', () => {
    expect(builder.dispatchLink(orderWith(null), 'Pizzaria do Zé')).toBeNull();
  });
});
