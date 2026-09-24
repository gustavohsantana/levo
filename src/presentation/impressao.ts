/**
 * O que o papel cobra.
 *
 * O painel e o app do motoboy mostram `amount` — o valor guardado no pedido.
 * O cupom antigo somava as linhas e, no fim, a taxa. Pedido do cardápio tem
 * linha, então o papel fechava. Pedido lançado na mão guarda o valor e não
 * cria item: a soma dava zero, a taxa entrava sozinha, e a rota mandava
 * receber R$ 0,00 num pedido que a tela cobrava dezenas de reais.
 *
 * Com item, a conta continua sendo a das linhas mais a taxa — é o que a
 * cozinha montou, e no cardápio isso já é o mesmo `amount`. Sem item, o
 * papel cobra o valor do painel. A taxa sai desse valor, para o subtotal
 * e o total fecharem na mesma conta que o dono vê.
 */
export interface LinhaDeImpressao {
  unitPriceCents: number;
  quantity: number;
  discountCents: number;
}

export interface TotaisDeImpressao {
  subtotalCents: number;
  taxaCents: number;
  totalCents: number;
}

export function totaisParaImpressao(pedido: {
  items: LinhaDeImpressao[];
  deliveryFeeCents: number;
  amountCents: number;
  pickup: boolean;
}): TotaisDeImpressao {
  const taxa = pedido.pickup ? 0 : Math.max(0, pedido.deliveryFeeCents);

  if (pedido.items.length > 0) {
    const subtotalCents = pedido.items.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity - item.discountCents,
      0,
    );
    return { subtotalCents, taxaCents: taxa, totalCents: subtotalCents + taxa };
  }

  const totalCents = Math.max(0, pedido.amountCents);
  const taxaCents = Math.min(taxa, totalCents);
  return { subtotalCents: totalCents - taxaCents, taxaCents, totalCents };
}
