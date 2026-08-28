/**
 * Estado do cardápio no aparelho do cliente: carrinho, rascunho do endereço e
 * o Pix/cartão que ainda não confirmou. Sem isso, cada URL nova do fluxo
 * (cardápio → pedido → pagamento) nascia vazia, e o botão voltar perdia o pedido.
 *
 * Só o navegador lê e grava. Não vai para o servidor.
 */

export type Quantidades = Record<string, number>;

export type RascunhoPedido = {
  customerName: string;
  customerPhone: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  reference: string;
  notes: string;
  modoPagamento: 'entrega' | 'pix_online' | 'cartao_online';
  paymentMethod: string;
};

export type PagamentoPendente = {
  orderId?: string;
  trackingToken: string;
};

function chave(prefixo: string, slug: string) {
  return `levo:${prefixo}:${slug}`;
}

function lerJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = sessionStorage.getItem(key);
    if (!bruto) return null;
    return JSON.parse(bruto) as T;
  } catch {
    return null;
  }
}

function gravarJson(key: string, valor: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key, JSON.stringify(valor));
}

export function lerCarrinho(slug: string): Quantidades {
  return lerJson<Quantidades>(chave('carrinho', slug)) ?? {};
}

export function gravarCarrinho(slug: string, quantidades: Quantidades) {
  gravarJson(chave('carrinho', slug), quantidades);
}

export function lerRascunho(slug: string): RascunhoPedido | null {
  return lerJson<RascunhoPedido>(chave('rascunho', slug));
}

export function gravarRascunho(slug: string, rascunho: RascunhoPedido) {
  gravarJson(chave('rascunho', slug), rascunho);
}

export function lerPagamentoPendente(slug: string): PagamentoPendente | null {
  return lerJson<PagamentoPendente>(chave('pagamento', slug));
}

export function gravarPagamentoPendente(slug: string, pagamento: PagamentoPendente) {
  gravarJson(chave('pagamento', slug), pagamento);
}

export function limparPagamentoPendente(slug: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(chave('pagamento', slug));
}

export function gravarLojaDoFluxo(slug: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('levo:loja', slug);
}

export function lerLojaDoFluxo(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('levo:loja');
}
