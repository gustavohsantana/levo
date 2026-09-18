import { describe, expect, it, vi } from 'vitest';
import {
  Food99OrderSource,
  type EventoPendenteFood99,
  type FilaDeEventosFood99,
} from '@/infrastructure/integrations/99food/adapter';
import type { Food99Pedidos } from '@/infrastructure/integrations/99food/pedidos';

/**
 * O importador do 99Food.
 *
 * Dois grupos de risco, e eles são diferentes:
 *
 * 1. **O mapeamento.** É onde se erra o centavo, o complemento e — o caso novo
 *    desta integração — quem entrega o pedido. Mandar para a rota um pedido que
 *    o entregador do 99Food já veio buscar é uma corrida perdida.
 *
 * 2. **A fila.** Aqui não há endpoint de pendentes: a entrada é a tabela de
 *    eventos do webhook. Carimbar um evento cujo pedido não foi gravado perde o
 *    pedido para sempre, e não carimbar faz a fila crescer sem parar.
 */

const ORDER_ID = '5764617763114451489';
const SHOP = 'lojadeteste';

/** Um pedido do 99Food como a API deles o devolve, com o mínimo preenchido. */
function pedido99(extra: Record<string, unknown> = {}) {
  return {
    order_id: ORDER_ID,
    order_index: 7,
    pay_type: 1,
    delivery_type: 1,
    create_time: 1_758_000_000,
    price: { customer_need_paying_money: 4990, delivery_price: 700 },
    receive_address: {
      name: 'Maria Souza',
      calling_code: '+55',
      phone: '35999887766',
      city: 'Pouso Alegre',
      poi_address: 'Rua das Flores',
      house_number: '100',
    },
    order_items: [
      { name: 'Pizza Calabresa', total_price: 4290, amount: 1, sub_item_list: [] },
    ],
    ...extra,
  };
}

function montar(
  detalhe: unknown,
  eventos: EventoPendenteFood99[] = [{ id: 'ev-1', code: 'orderNew', externalOrderId: ORDER_ID }],
) {
  const concluidos: string[][] = [];
  const buscar = vi.fn(async () => detalhe);

  const fila: FilaDeEventosFood99 = {
    pendentes: async () => eventos,
    concluir: async (ids) => {
      concluidos.push(ids);
    },
  };

  const source = new Food99OrderSource({
    pedidos: { detalhe: buscar } as unknown as Food99Pedidos,
    appShopId: SHOP,
    fila,
  });

  return { source, buscar, concluidos };
}

describe('importador do 99Food: quem entrega', () => {
  it('delivery_type 1 é entrega do 99Food — fica fora da rota e sem taxa nossa', async () => {
    const { source } = montar(pedido99({ delivery_type: 1 }));

    const [pedido] = await source.fetchPending();

    expect(pedido?.fulfillment).toBe('PLATFORM');
    /*
     * A taxa é do 99Food, não nossa. Lançá-la aqui inflaria o faturamento do dia
     * com dinheiro que nunca passou pelo caixa da loja.
     */
    expect(pedido?.deliveryFeeCents).toBeUndefined();
  });

  it('delivery_type 2 é entrega da loja — entra na rota, com a taxa que veio', async () => {
    const { source } = montar(pedido99({ delivery_type: 2 }));

    const [pedido] = await source.fetchPending();

    expect(pedido?.fulfillment).toBe('DELIVERY');
    expect(pedido?.deliveryFeeCents).toBe(700);
  });

  it('tipo desconhecido continua sendo entrega nossa, não some da rota', async () => {
    const { source } = montar(pedido99({ delivery_type: 9 }));

    expect((await source.fetchPending())[0]?.fulfillment).toBe('DELIVERY');
  });
});

describe('importador do 99Food: mapeamento', () => {
  it('guarda o order_id inteiro e mostra o order_index', async () => {
    const { source } = montar(pedido99());

    const [pedido] = await source.fetchPending();

    // 19 dígitos, sem arredondar: é com ele que se confirma o pedido na API.
    expect(pedido?.externalId).toBe(ORDER_ID);
    // E "7" é o que o cliente fala no telefone. A homologação exige os dois.
    expect(pedido?.displayId).toBe('7');
  });

  it('divide o preço da linha pela quantidade e achata os complementos', async () => {
    const { source } = montar(
      pedido99({
        order_items: [
          {
            name: 'Pizza Calabresa',
            total_price: 8580,
            amount: 2,
            remark: 'sem cebola',
            sub_item_list: [
              { name: 'Borda catupiry', amount: 1 },
              { name: 'Refrigerante', amount: 2, sub_item_list: [{ name: 'Guaraná lata' }] },
            ],
          },
        ],
      }),
    );

    const [pedido] = await source.fetchPending();
    const item = pedido?.items?.[0];

    expect(item?.quantity).toBe(2);
    // `total_price` é a linha inteira; a entidade quer o unitário.
    expect(item?.unitPriceCents).toBe(4290);
    // O aninhado vira linha própria, e a observação do item entra junto.
    expect(item?.options).toEqual([
      'Borda catupiry',
      '2× Refrigerante',
      'Guaraná lata',
      'sem cebola',
    ]);
  });

  it('põe nas observações o que o entregador adianta no pedido em dinheiro', async () => {
    const { source } = montar(
      pedido99({
        pay_type: 2,
        remark: 'interfone quebrado',
        price: { customer_need_paying_money: 4990, shop_paid_money: 4290 },
      }),
    );

    const [pedido] = await source.fetchPending();

    expect(pedido?.paymentMethod).toBe('CASH');
    /*
     * Sem esse número o caixa não fecha: é o valor que o entregador do 99Food
     * entrega em mãos no balcão.
     */
    expect(pedido?.notes).toBe('interfone quebrado · 99Food: entregador adianta R$ 42,90');
  });

  it('não inventa adiantamento em pedido pago online', async () => {
    const { source } = montar(pedido99({ pay_type: 1, price: { shop_paid_money: 4290 } }));

    expect((await source.fetchPending())[0]?.notes).toBeNull();
  });

  it('cliente sem nome vira o número do pedido, não uma linha anônima', async () => {
    const { source } = montar(pedido99({ receive_address: { city: 'Pouso Alegre' } }));

    const [pedido] = await source.fetchPending();

    expect(pedido?.customerName).toBe('Pedido 99Food #7');
    expect(pedido?.customerPhone).toBeNull();
  });

  it('monta endereço e telefone como se lê em voz alta', async () => {
    const { source } = montar(pedido99());

    const [pedido] = await source.fetchPending();

    expect(pedido?.address).toBe('Rua das Flores, 100 - Pouso Alegre');
    expect(pedido?.customerPhone).toBe('+5535999887766');
    expect(pedido?.placedAt.getTime()).toBe(1_758_000_000_000);
  });
});

describe('importador do 99Food: a fila de eventos', () => {
  it('busca o detalhe uma vez só quando o mesmo pedido gerou vários eventos', async () => {
    const { source, buscar, concluidos } = montar(pedido99(), [
      { id: 'ev-1', code: 'orderNew', externalOrderId: ORDER_ID },
      { id: 'ev-2', code: 'orderStatusChange', externalOrderId: ORDER_ID },
    ]);

    const pedidos = await source.fetchPending();
    await source.acknowledge(pedidos.map((p) => p.externalId));

    expect(pedidos).toHaveLength(1);
    expect(buscar).toHaveBeenCalledTimes(1);
    // Os DOIS eventos saem da fila: deixar o segundo faria ela crescer sempre.
    expect(concluidos).toEqual([['ev-1', 'ev-2']]);
  });

  it('não carimba o evento quando o detalhe falha — o pedido volta no próximo ciclo', async () => {
    const { source, concluidos } = montar(pedido99(), [
      { id: 'ev-1', code: 'orderNew', externalOrderId: ORDER_ID },
    ]);
    // Substitui a busca por uma que estoura, como a plataforma fora do ar.
    const quebrado = new Food99OrderSource({
      pedidos: {
        detalhe: async () => {
          throw new Error('HTTP 500');
        },
      } as unknown as Food99Pedidos,
      appShopId: SHOP,
      fila: {
        pendentes: async () => [{ id: 'ev-1', code: 'orderNew', externalOrderId: ORDER_ID }],
        concluir: async (ids) => {
          concluidos.push(ids);
        },
      },
    });

    expect(await quebrado.fetchPending()).toEqual([]);
    await quebrado.acknowledge([]);

    expect(concluidos).toEqual([]);
    // E o source normal continua funcionando — o teste acima é sobre a falha.
    expect(await source.fetchPending()).toHaveLength(1);
  });

  it('mantém na fila o pedido que o caso de uso não conseguiu gravar', async () => {
    /*
     * O caso de uso só reconhece o que gravou. Se o banco caiu no meio, o pedido
     * não vem na lista do `acknowledge` — e o evento dele tem que continuar
     * pendente, porque esta fila é a ÚNICA cópia: o 99Food não tem endpoint para
     * relistar o que já empurrou.
     */
    const { source, concluidos } = montar(pedido99(), [
      { id: 'ev-1', code: 'orderNew', externalOrderId: ORDER_ID },
      { id: 'ev-2', code: 'orderCancel', externalOrderId: '999' },
    ]);

    await source.fetchPending();
    await source.acknowledge([]); // nada gravou

    // Só o cancelamento sai: ele nunca viraria pedido de todo jeito.
    expect(concluidos).toEqual([['ev-2']]);
  });

  it('reconhece cancelamento sem importar pedido nenhum', async () => {
    const { source, buscar, concluidos } = montar(pedido99(), [
      { id: 'ev-9', code: 'orderCancel', externalOrderId: ORDER_ID },
    ]);

    const pedidos = await source.fetchPending();
    await source.acknowledge([]);

    expect(pedidos).toEqual([]);
    expect(buscar).not.toHaveBeenCalled();
    /*
     * Carimbado mesmo sem importar: sem isso o evento voltaria a cada 30
     * segundos para sempre. Refletir o cancelamento no pedido que já está no
     * painel depende dos códigos de status que a especificação não documenta.
     */
    expect(concluidos).toEqual([['ev-9']]);
  });
});
