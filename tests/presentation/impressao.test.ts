import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { totaisParaImpressao } from '@/presentation/impressao';
import { ComandaCupomPrint } from '@/presentation/ui/patterns/comanda-cupom-print';
import { RotaPrint } from '@/presentation/ui/patterns/rota-print';
import type { OrderView, RotaImpressao } from '@/presentation/queries';

function reais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pedido(parcial: Partial<OrderView> & Pick<OrderView, 'amountCents' | 'deliveryFeeCents' | 'items'>): OrderView {
  return {
    id: 'pedido-1',
    customerName: 'Cliente Auditoria',
    customerPhone: null,
    address: 'Rua Adolfo Olinto, 120',
    reference: null,
    notes: null,
    source: 'MANUAL',
    displayId: null,
    paymentMethod: null,
    status: 'NEW',
    stage: 'NOVO',
    confirmedAt: null,
    readyAt: null,
    urgente: false,
    pickup: false,
    plataformaLeva: false,
    isGeocoded: true,
    coordinates: null,
    createdAt: '2026-09-24T15:00:00.000Z',
    trackingUrl: 'https://exemplo.test/t/abc',
    whatsappLink: null,
    paymentStatus: null,
    ...parcial,
  };
}

describe('valor impresso', () => {
  it('pedido manual sem item cobra o valor do painel, não só a taxa', () => {
    const totais = totaisParaImpressao({
      items: [],
      deliveryFeeCents: 600,
      amountCents: 3990,
      pickup: false,
    });

    expect(totais).toEqual({ subtotalCents: 3390, taxaCents: 600, totalCents: 3990 });

    const html = renderToStaticMarkup(
      createElement(ComandaCupomPrint, {
        loja: 'Pizzaria do Zé',
        pedido: pedido({ amountCents: 3990, deliveryFeeCents: 600, items: [] }),
      }),
    );

    expect(html).toContain(`R$ ${reais(3990)}`);
    expect(html).not.toContain(`R$ ${reais(600)}`);
    expect(html).toContain(reais(3390));
    expect(html).toContain('Não há itens registrados neste pedido.');
  });

  it('pedido do cardápio continua somando o item e a taxa', () => {
    const totais = totaisParaImpressao({
      items: [{ unitPriceCents: 4990, quantity: 1, discountCents: 0 }],
      deliveryFeeCents: 600,
      amountCents: 5590,
      pickup: false,
    });

    expect(totais).toEqual({ subtotalCents: 4990, taxaCents: 600, totalCents: 5590 });

    const html = renderToStaticMarkup(
      createElement(ComandaCupomPrint, {
        loja: 'Pizzaria do Zé',
        pedido: pedido({
          amountCents: 5590,
          deliveryFeeCents: 600,
          source: 'SITE',
          paymentMethod: 'CASH',
          customerName: 'Cliente Cardápio',
          items: [
            {
              name: 'Pizza Margherita',
              options: [],
              quantity: 1,
              unitPriceCents: 4990,
              discountCents: 0,
              imageUrl: null,
            },
          ],
        }),
      }),
    );

    expect(html).toContain('Pizza Margherita');
    expect(html).toContain(reais(4990));
    expect(html).toContain(`R$ ${reais(5590)}`);
    expect(html).toContain('DINHEIRO');
  });

  it('desconto na linha do cardápio continua saindo do subtotal', () => {
    expect(
      totaisParaImpressao({
        items: [{ unitPriceCents: 5000, quantity: 2, discountCents: 100 }],
        deliveryFeeCents: 600,
        amountCents: 10_500,
        pickup: false,
      }),
    ).toEqual({ subtotalCents: 9900, taxaCents: 600, totalCents: 10_500 });
  });

  it('retirada no balcão não soma taxa', () => {
    expect(
      totaisParaImpressao({
        items: [{ unitPriceCents: 4990, quantity: 1, discountCents: 0 }],
        deliveryFeeCents: 600,
        amountCents: 4990,
        pickup: true,
      }),
    ).toEqual({ subtotalCents: 4990, taxaCents: 0, totalCents: 4990 });
  });

  it('rota impressa manda receber o valor do painel nos pedidos sem item', () => {
    const valores = [8990, 6790, 12450];

    for (const amountCents of valores) {
      expect(
        totaisParaImpressao({
          items: [],
          deliveryFeeCents: 0,
          amountCents,
          pickup: false,
        }).totalCents,
      ).toBe(amountCents);
    }

    const rota: RotaImpressao = {
      loja: 'Pizzaria do Zé',
      courier: 'Jefferson Alves',
      criadoEm: '2026-09-24T15:00:00.000Z',
      paradas: valores.map((totalCents, indice) => ({
        posicao: indice + 1,
        displayId: null,
        cliente: `Cliente ${indice + 1}`,
        telefone: null,
        endereco: 'Rua do Centro',
        referencia: null,
        pickup: false,
        itensResumo: '',
        totalCents,
        pagamento: null,
        pago: false,
      })),
    };

    const html = renderToStaticMarkup(createElement(RotaPrint, { rota }));

    for (const totalCents of valores) {
      expect(html).toContain(`RECEBER R$ ${reais(totalCents)}`);
    }
    expect(html).not.toContain(`RECEBER R$ ${reais(0)}`);
  });
});
