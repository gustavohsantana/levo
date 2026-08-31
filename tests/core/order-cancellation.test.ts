import { describe, expect, it } from 'vitest';
import { Coordinates } from '@/core';
import { makeOrder } from '../helpers/fixtures';

/**
 * O cancelamento vindo da plataforma manda, inclusive sobre pedido entregue.
 *
 * A versão anterior desistia calada quando o pedido já estava entregue, para
 * não desfazer o trabalho do motoboy. Custou uma tarde de investigação: o iFood
 * cancelou um pedido e o painel seguiu mostrando "Entregue", sem log, sem
 * evento, sem nada para investigar.
 *
 * Quem cancela decide se o lojista recebe. Mostrar "Entregue" num pedido
 * cancelado esconde exatamente a parte que dói.
 */
const ponto = Coordinates.create(-25.43, -49.27);

describe('cancelamento externo', () => {
  it('cancela um pedido novo', () => {
    const order = makeOrder('o1', ponto, { source: 'IFOOD', externalId: 'ext-1' });

    order.markCancelledExternally();

    expect(order.status).toBe('CANCELLED');
  });

  it('cancela também um pedido já entregue, e marca que estava entregue', () => {
    const order = makeOrder('o2', ponto, { source: 'IFOOD', externalId: 'ext-2' });
    order.markConcludedExternally();
    expect(order.status).toBe('DELIVERED');
    order.pullEvents();

    order.markCancelledExternally();

    expect(order.status).toBe('CANCELLED');
    const evento = order.pullEvents().find((e) => e.name === 'order.cancelled_externally');
    expect(evento).toBeDefined();
    expect(evento?.payload).toMatchObject({ entregue: true });
  });

  it('cancelar duas vezes não gera segundo evento — reentrega de polling é normal', () => {
    const order = makeOrder('o3', ponto, { source: 'IFOOD', externalId: 'ext-3' });
    order.markCancelledExternally();
    order.pullEvents();

    order.markCancelledExternally();

    expect(order.pullEvents()).toHaveLength(0);
    expect(order.status).toBe('CANCELLED');
  });

  it('solta a rota ao cancelar — parada de pedido morto não vai no baú', () => {
    const order = makeOrder('o4', ponto, { source: 'IFOOD', externalId: 'ext-4' });
    order.assignToRoute('rota-1');
    expect(order.routeId).toBe('rota-1');

    order.markCancelledExternally();

    expect(order.routeId).toBeNull();
  });
});
