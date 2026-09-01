/**
 * Estado do cardápio no aparelho do cliente: carrinho, rascunho do endereço e
 * o Pix/cartão que ainda não confirmou. Sem isso, cada URL nova do fluxo
 * (cardápio → pedido → pagamento) nascia vazia, e o botão voltar perdia o pedido.
 *
 * Só o navegador lê e grava. Não vai para o servidor.
 */

export type Quantidades = Record<string, number>;

/**
 * Uma linha do carrinho.
 *
 * Linha, e não `produto → quantidade`, porque duas pizzas do mesmo tamanho com
 * sabores diferentes são coisas diferentes. O mapa antigo não conseguia
 * representar isso: a segunda escolha sobrescrevia a primeira.
 */
export type LinhaCarrinho = {
  /** Identifica a linha no carrinho, não o produto. */
  id: string;
  productId: string;
  quantity: number;
  /** O que foi escolhido: ids de opção, por grupo. Vazio em produto simples. */
  options: Record<string, string[]>;
  /** Preço unitário já com as opções — para exibir. O servidor recalcula. */
  unitPriceCents: number;
  /** Os nomes escolhidos, para o cliente conferir o que montou. */
  nomes: string[];
};

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

/**
 * O carrinho guardado no aparelho.
 *
 * Descarta o formato antigo em vez de tentar convertê-lo: quem tinha carrinho
 * quando isto mudou perde o carrinho, e é melhor que herdar linha sem opção num
 * produto que agora exige sabor — o pedido seria recusado no fim, depois de o
 * cliente preencher o endereço.
 */
export function lerCarrinho(slug: string): LinhaCarrinho[] {
  const bruto = lerJson<unknown>(chave('carrinho', slug));
  if (!Array.isArray(bruto)) return [];
  return bruto.filter(
    (linha): linha is LinhaCarrinho =>
      typeof linha === 'object' && linha !== null && 'productId' in linha && 'id' in linha,
  );
}

export function gravarCarrinho(slug: string, linhas: LinhaCarrinho[]) {
  gravarJson(chave('carrinho', slug), linhas);
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
