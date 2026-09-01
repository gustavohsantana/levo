import { describe, expect, it } from 'vitest';
import { Coordinates } from '@/core';
import { makeOrder } from '../helpers/fixtures';

/**
 * O marketplace conclui o pedido por conta propria. Depois disso, o motoboy
 * ainda toca "entreguei" na tela dele — e ate ontem isso lançava, a transação
 * inteira voltava atrás e a PARADA continuava pendente.
 *
 * O sintoma era o pior tipo: a tela do motoboy dizia OK, o painel seguia
 * mostrando o pedido em rota, e não havia erro em lugar nenhum.
 */
const ponto = Coordinates.create(-25.43, -49.27);

describe('confirmar entrega duas vezes', () => {
  it('a segunda confirmação não lança', () => {
    const order = makeOrder('o1', ponto, { source: 'IFOOD', externalId: 'ext-1' });
    order.assignToRoute('rota-1');
    order.markDelivered();

    expect(() => order.markDelivered()).not.toThrow();
    expect(order.status).toBe('DELIVERED');
  });

  it('não gera segundo evento de entrega', () => {
    const order = makeOrder('o2', ponto, { source: 'IFOOD', externalId: 'ext-2' });
    order.assignToRoute('rota-1');
    order.markDelivered();
    order.pullEvents();

    order.markDelivered();

    expect(order.pullEvents()).toHaveLength(0);
  });

  it('pedido que nunca saiu continua recusando', () => {
    const order = makeOrder('o3', ponto);

    expect(() => order.markDelivered()).toThrow();
  });
});
