export type PassoPedido = 'cardapio' | 'pedido' | 'pagamento' | 'acompanhar';

export const PASSOS_PEDIDO: Array<{ id: PassoPedido; label: string }> = [
  { id: 'cardapio', label: 'Cardápio' },
  { id: 'pedido', label: 'Pedido' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'acompanhar', label: 'Acompanhar' },
];

export function passoDaRota(pathname: string): PassoPedido {
  if (pathname.startsWith('/t/')) return 'acompanhar';
  if (pathname.includes('/pagamento')) return 'pagamento';
  if (pathname.includes('/pedido')) return 'pedido';
  return 'cardapio';
}

export function hrefsDoFluxo(
  slug: string,
  opts?: { pedidoId?: string | null; trackingToken?: string | null },
): Record<PassoPedido, string | null> {
  return {
    cardapio: `/cardapio/${slug}`,
    pedido: `/cardapio/${slug}/pedido`,
    pagamento: opts?.pedidoId ? `/cardapio/${slug}/pagamento?pedido=${opts.pedidoId}` : null,
    acompanhar: opts?.trackingToken ? `/t/${opts.trackingToken}` : null,
  };
}

export function passoJaPassou(atual: PassoPedido, candidato: PassoPedido): boolean {
  return PASSOS_PEDIDO.findIndex((p) => p.id === candidato) < PASSOS_PEDIDO.findIndex((p) => p.id === atual);
}
