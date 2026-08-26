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
  const builder = new WhatsAppLinkBuilder('https://levo.app/');

  it('monta link wa.me com telefone normalizado e mensagem pronta', () => {
    const order = orderWith('(41) 99999-9999');

    const link = builder.dispatchLink(order, 'Pizzaria do Zé')!;
    const url = new URL(link);

    expect(url.origin + url.pathname).toBe('https://wa.me/5541999999999');
    const text = url.searchParams.get('text')!;
    expect(text).toContain('Oi, Maria!');
    expect(text).toContain('Pizzaria do Zé');
    expect(text).toContain(`https://levo.app/t/${order.trackingToken.value}`);
  });

  it('trata a barra final da URL base sem duplicar', () => {
    expect(builder.trackingUrl(orderWith(null))).not.toContain('//t/');
  });

  it('devolve null quando o pedido não tem telefone', () => {
    expect(builder.dispatchLink(orderWith(null), 'Pizzaria do Zé')).toBeNull();
  });
});

/**
 * O link da rota para o motoboy.
 *
 * Copiar e colar é um passo que se perde na correria — e o link colado na
 * conversa errada entrega a rota de um motoboy a outro.
 */
describe('routeLink', () => {
  const builder = new WhatsAppLinkBuilder('https://levoentregas.vercel.app');

  const base = {
    accessToken: 'n3tVnThLwWzXbTYNuPHWTg',
    courierWhatsapp: '5541999990001',
    courierName: 'Jefferson Silva',
    stops: 3,
  };

  it('abre a conversa do motoboy com a rota escrita', () => {
    const link = builder.routeLink(base)!;
    const texto = decodeURIComponent(new URL(link).searchParams.get('text')!);

    expect(link.startsWith('https://wa.me/5541999990001?')).toBe(true);
    expect(texto).toContain('Jefferson');
    expect(texto).toContain('3 pedidos');
    expect(texto).toContain('https://levoentregas.vercel.app/m/n3tVnThLwWzXbTYNuPHWTg');
  });

  it('usa só o primeiro nome', () => {
    // "Oi, Jefferson Silva!" soa como cobrança; "Oi, Jefferson!" soa como
    // mensagem de quem trabalha junto.
    const texto = decodeURIComponent(
      new URL(builder.routeLink(base)!).searchParams.get('text')!,
    );

    expect(texto).toContain('Oi, Jefferson!');
  });

  it('concorda no singular com uma parada só', () => {
    const texto = decodeURIComponent(
      new URL(builder.routeLink({ ...base, stops: 1 })!).searchParams.get('text')!,
    );

    expect(texto).toContain('1 pedido está pronta');
    expect(texto).not.toContain('1 pedidos');
  });

  it('devolve null sem telefone — a tela esconde o botão', () => {
    expect(builder.routeLink({ ...base, courierWhatsapp: null })).toBeNull();
  });
});
