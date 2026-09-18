import { randomUUID } from 'node:crypto';
import { ExternalServiceError, type Logger } from '@/core';

/**
 * O módulo Catalog do iFood — o cardápio da loja, gerido de dentro do Levô.
 *
 * O cardápio tem três níveis: catálogo → categoria → item. O item tem grupos de
 * complementos, e cada complemento é ele próprio um "produto". O que muda aqui
 * reflete no Portal do Parceiro — é o que a homologação do Catalog exige provar.
 *
 * A parte espinhosa é o `PUT /items`: ele NÃO tem PATCH de campo. Para mudar o
 * nome de um item, ou anexar um grupo de complementos, reenvia-se a estrutura
 * INTEIRA (item + todos os produtos + grupos + opções). Por isso este adapter
 * trabalha com um modelo normalizado (`ItemIfood`): quem chama descreve o item
 * como um todo, e o adapter monta o payload que o iFood espera e relê a resposta
 * de volta para o mesmo modelo — já com os ids que o iFood atribuiu.
 *
 * Exceções ao PUT: preço e disponibilidade têm PATCH próprio, e a homologação
 * exige usá-los (`/items/price`, `/items/status`, `/options/price`,
 * `/options/status`). Todos recebem UM objeto, não uma lista.
 *
 * Contratos confirmados ao vivo contra o app de teste (sandbox), campo a campo.
 */

const BASE_PADRAO = 'https://merchant-api.ifood.com.br';
const V = '/catalog/v2.0';

export type StatusCatalogo = 'AVAILABLE' | 'UNAVAILABLE';

export interface CategoriaIfood {
  id: string;
  name: string;
  status: string;
  index?: number;
  template?: string;
  items?: unknown[];
}

/** Um complemento: nome, preço, disponibilidade e foto. É um produto à parte. */
export interface OpcaoIfood {
  /** Vazio ao criar; preenchido pelo iFood e usado nos PATCH de opção. */
  id?: string;
  productId?: string;
  name: string;
  imagePath?: string;
  status: StatusCatalogo;
  /** Em reais (ex.: 3.5). O iFood chama de `price.value`. */
  priceValue: number;
}

/** Um grupo de complementos, com seu mínimo/máximo de escolhas. */
export interface GrupoIfood {
  id?: string;
  name: string;
  status: StatusCatalogo;
  min: number;
  max: number;
  opcoes: OpcaoIfood[];
}

/** Um item do cardápio, do jeito que o Levô o descreve (modelo normalizado). */
export interface ItemIfood {
  /** Vazio ao criar; preenchido pelo iFood e usado nos PATCH de item. */
  id?: string;
  categoryId: string;
  externalCode: string;
  status: StatusCatalogo;
  priceValue: number;
  produto: { id?: string; name: string; description?: string; imagePath?: string };
  grupos: GrupoIfood[];
}

export class IfoodCatalog {
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      accessToken: () => Promise<string>;
      merchantId: string;
      logger?: Logger;
      baseUrl?: string;
    },
  ) {
    this.baseUrl = opts.baseUrl ?? BASE_PADRAO;
  }

  private get m() {
    return this.opts.merchantId;
  }

  // ---- leitura ----

  /** O catálogo DEFAULT da loja — o do app do iFood. */
  async catalogoPadrao(): Promise<string> {
    const catalogos = await this.req<Array<{ catalogId: string; context: string[] }>>(
      'GET',
      `${V}/merchants/${this.m}/catalogs`,
    );
    const padrao = catalogos.find((c) => c.context?.includes('DEFAULT')) ?? catalogos[0];
    if (!padrao) throw new ExternalServiceError('iFood', 'loja sem catálogo');
    return padrao.catalogId;
  }

  categorias(catalogId: string, comItens = true): Promise<CategoriaIfood[]> {
    return this.req<CategoriaIfood[]>(
      'GET',
      `${V}/merchants/${this.m}/catalogs/${catalogId}/categories?includeItems=${comItens}`,
    );
  }

  /**
   * Um item completo, do jeito normalizado — para carregar um item já existente
   * na tela e editá-lo. O detalhe do iFood não traz a categoria; ela vem da
   * listagem (os itens já chegam agrupados por categoria), então quem chama a
   * informa.
   */
  async item(itemId: string, categoryId: string): Promise<ItemIfood> {
    const d = await this.req<DetalheItem>('GET', `${V}/merchants/${this.m}/items/${itemId}`);
    return {
      id: d.id,
      categoryId,
      externalCode: d.externalCode || `LEVO-${Date.now()}`,
      status: (d.status as StatusCatalogo) ?? 'AVAILABLE',
      priceValue: d.price?.value ?? 0,
      produto: { id: d.productId, name: d.name, imagePath: caminhoRelativo(d.imagePath) },
      grupos: (d.optionGroups ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        status: (g.status as StatusCatalogo) ?? 'AVAILABLE',
        min: g.min ?? 0,
        max: g.max ?? 0,
        opcoes: (g.options ?? []).map((o) => ({
          id: o.id,
          productId: o.productId,
          name: o.name,
          imagePath: caminhoRelativo(o.imagePath),
          status: (o.status as StatusCatalogo) ?? 'AVAILABLE',
          priceValue: o.price?.value ?? 0,
        })),
      })),
    };
  }

  /**
   * O item para edição, com os preços EFETIVOS do contexto DEFAULT.
   *
   * O detalhe (`item()`) devolve preço defasado: 0 no item e o preço ANTIGO nos
   * complementos — o preço real mora no contexto DEFAULT (a listagem). Sem isto,
   * (1) o Levô mostra o preço velho do complemento e (2) ao salvar reenvia esse
   * valor, revertendo no iFood um preço que o lojista mudou pelo Portal. Aqui a
   * gente relê a listagem e sobrescreve item e complementos pelo preço efetivo.
   */
  async itemParaEditar(itemId: string, categoryId: string): Promise<ItemIfood> {
    const [detalhe, catalogId] = await Promise.all([
      this.item(itemId, categoryId),
      this.catalogoPadrao(),
    ]);
    const categorias = await this.categorias(catalogId, true).catch(() => [] as CategoriaIfood[]);
    const naListagem = categorias
      .flatMap((c) => (c.items ?? []) as Array<Record<string, unknown>>)
      .find((it) => String(it.id) === itemId);
    if (!naListagem) return detalhe;

    const precoDe = (x: unknown) => Number((x as { value?: number } | undefined)?.value);
    const precoItem = precoDe(naListagem.price);
    const precoOpcao = new Map<string, number>();
    for (const g of (naListagem.optionGroups ?? []) as Array<Record<string, unknown>>) {
      for (const o of (g.options ?? []) as Array<Record<string, unknown>>) {
        const v = precoDe(o.price);
        if (o.id && Number.isFinite(v)) precoOpcao.set(String(o.id), v);
      }
    }

    return {
      ...detalhe,
      priceValue: Number.isFinite(precoItem) ? precoItem : detalhe.priceValue,
      grupos: detalhe.grupos.map((g) => ({
        ...g,
        opcoes: g.opcoes.map((o) =>
          o.id && precoOpcao.has(o.id) ? { ...o, priceValue: precoOpcao.get(o.id)! } : o,
        ),
      })),
    };
  }

  // ---- Cenário 1: categoria ----

  criarCategoria(catalogId: string, nome: string): Promise<CategoriaIfood> {
    return this.req<CategoriaIfood>(
      'POST',
      `${V}/merchants/${this.m}/catalogs/${catalogId}/categories`,
      { name: nome, externalCode: `LEVO-${Date.now()}`, status: 'AVAILABLE', index: 99, template: 'DEFAULT' },
    );
  }

  // ---- fotos ----

  /** Sobe uma imagem (data URI base64) e devolve o `imagePath` para usar no item. */
  async enviarImagem(dataUri: string): Promise<string> {
    const r = await this.req<{ imagePath: string }>('POST', `${V}/merchants/${this.m}/image/upload`, {
      image: dataUri,
    });
    return r.imagePath;
  }

  // ---- item (PUT da estrutura inteira) ----

  /**
   * Cria ou atualiza o item por completo. O iFood atribui os ids na resposta;
   * devolvemos o mesmo modelo já com eles, para os próximos PATCH e PUT.
   */
  async salvarItem(item: ItemIfood): Promise<ItemIfood> {
    const produtoId = item.produto.id ?? randomUUID();
    const grupos = item.grupos.map((g) => ({
      grupo: g,
      id: g.id ?? randomUUID(),
      opcoes: g.opcoes.map((o) => ({ opcao: o, id: o.id ?? randomUUID(), productId: o.productId ?? randomUUID() })),
    }));

    const products: Record<string, unknown>[] = [
      {
        id: produtoId,
        name: item.produto.name,
        description: item.produto.description ?? '',
        imagePath: item.produto.imagePath ?? '',
        externalCode: item.externalCode,
        ...(grupos.length
          ? { optionGroups: grupos.map((g) => ({ id: g.id, min: g.grupo.min, max: g.grupo.max })) }
          : {}),
      },
    ];
    for (const g of grupos) {
      for (const o of g.opcoes) {
        products.push({ id: o.productId, name: o.opcao.name, imagePath: o.opcao.imagePath ?? '' });
      }
    }

    const payload = {
      item: {
        ...(item.id ? { id: item.id } : {}),
        type: 'DEFAULT',
        categoryId: item.categoryId,
        status: item.status,
        price: { value: item.priceValue },
        index: 0,
        productId: produtoId,
        externalCode: item.externalCode,
      },
      products,
      optionGroups: grupos.map((g, i) => ({
        id: g.id,
        name: g.grupo.name,
        status: g.grupo.status,
        min: g.grupo.min,
        max: g.grupo.max,
        index: i,
        optionIds: g.opcoes.map((o) => o.id),
      })),
      options: grupos.flatMap((g) =>
        g.opcoes.map((o, i) => ({
          id: o.id,
          productId: o.productId,
          status: o.opcao.status,
          index: i,
          price: { value: o.opcao.priceValue },
        })),
      ),
    };

    const resp = await this.req<RespostaItem>('PUT', `${V}/merchants/${this.m}/items`, payload);
    return this.deResposta(resp, item);
  }

  // ---- Cenário 3: PATCH (um objeto por chamada) ----

  precoItem(itemId: string, valor: number): Promise<void> {
    return this.req('PATCH', `${V}/merchants/${this.m}/items/price`, { itemId, price: { value: valor } });
  }
  statusItem(itemId: string, status: StatusCatalogo): Promise<void> {
    return this.req('PATCH', `${V}/merchants/${this.m}/items/status`, { itemId, status });
  }
  precoOpcao(optionId: string, valor: number): Promise<void> {
    return this.req('PATCH', `${V}/merchants/${this.m}/options/price`, { optionId, price: { value: valor } });
  }

  /**
   * Exclui um item do cardápio. No iFood o item é sustentado por um PRODUTO;
   * apagar o produto remove o item (confirmado ao vivo: `DELETE .../items/{id}`
   * e as variações por categoria não existem — só `DELETE .../products/{id}`).
   */
  removerItem(productId: string): Promise<void> {
    return this.req<void>('DELETE', `${V}/merchants/${this.m}/products/${productId}`);
  }
  statusOpcao(optionId: string, status: StatusCatalogo): Promise<void> {
    return this.req('PATCH', `${V}/merchants/${this.m}/options/status`, { optionId, status });
  }

  /** Traduz a resposta do PUT de volta para o modelo normalizado, com os ids do iFood. */
  private deResposta(resp: RespostaItem, enviado: ItemIfood): ItemIfood {
    const produtos = new Map((resp.products ?? []).map((p) => [p.id, p]));
    const principal = produtos.get(resp.item.productId);
    return {
      id: resp.item.id,
      categoryId: resp.item.categoryId ?? enviado.categoryId,
      externalCode: resp.item.externalCode ?? enviado.externalCode,
      status: (resp.item.status as StatusCatalogo) ?? enviado.status,
      priceValue: resp.item.price?.value ?? enviado.priceValue,
      produto: {
        id: resp.item.productId,
        name: principal?.name ?? enviado.produto.name,
        description: principal?.description ?? enviado.produto.description,
        imagePath: principal?.imagePath || enviado.produto.imagePath,
      },
      grupos: (resp.optionGroups ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        status: (g.status as StatusCatalogo) ?? 'AVAILABLE',
        min: g.min ?? 0,
        max: g.max ?? 0,
        opcoes: (resp.options ?? [])
          .filter((o) => (g.optionIds ?? []).includes(o.id))
          .map((o) => ({
            id: o.id,
            productId: o.productId,
            name: produtos.get(o.productId)?.name ?? '',
            imagePath: produtos.get(o.productId)?.imagePath || undefined,
            status: (o.status as StatusCatalogo) ?? 'AVAILABLE',
            priceValue: o.price?.value ?? 0,
          })),
      })),
    };
  }

  private async req<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.opts.accessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => '');
      this.opts.logger?.warn({ path, status: response.status, detalhe }, 'ifood.catalog_falhou');
      throw new ExternalServiceError('iFood', mensagemDoErro(detalhe, response.status), {
        path,
        status: response.status,
      });
    }

    const texto = await response.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  }
}

interface DetalheItem {
  id: string;
  name: string;
  externalCode?: string;
  status?: string;
  productId: string;
  imagePath?: string;
  price?: { value: number };
  optionGroups?: Array<{
    id: string;
    name: string;
    status?: string;
    min?: number;
    max?: number;
    options?: Array<{
      id: string;
      name: string;
      productId: string;
      imagePath?: string;
      status?: string;
      price?: { value: number };
    }>;
  }>;
}

interface RespostaItem {
  item: {
    id: string;
    productId: string;
    categoryId?: string;
    externalCode?: string;
    status?: string;
    price?: { value: number };
  };
  products?: Array<{ id: string; name?: string; description?: string; imagePath?: string }>;
  optionGroups?: Array<{
    id: string;
    name: string;
    status?: string;
    min?: number;
    max?: number;
    optionIds?: string[];
  }>;
  options?: Array<{ id: string; productId: string; status?: string; price?: { value: number } }>;
}

/**
 * O erro do iFood vem como `{ error: { code, message, details:[{field,message}] } }`.
 * Os `details` são o que diz qual campo reprovou — vale carregá-los.
 */
/**
 * O caminho relativo da imagem, que é o que o `PUT` aceita.
 *
 * O upload devolve algo como `<merchantId>/<arquivo>.jpeg`, mas a leitura devolve
 * a URL pública completa (`https://static-images.ifood.com.br/pratos/<...>`).
 * Reenviar a URL completa no PUT quebraria — então guardamos sempre o relativo.
 */
function caminhoRelativo(imagePath?: string): string | undefined {
  if (!imagePath) return undefined;
  const marca = '/pratos/';
  const i = imagePath.indexOf(marca);
  return i >= 0 ? imagePath.slice(i + marca.length) : imagePath;
}

function mensagemDoErro(corpo: string, status: number): string {
  try {
    const erro = JSON.parse(corpo)?.error;
    if (erro?.message) {
      const campos = Array.isArray(erro.details)
        ? erro.details
            .map((d: { message?: string }) => d.message)
            .filter(Boolean)
            .join('; ')
        : '';
      const base = erro.code ? `${erro.code}: ${erro.message}` : erro.message;
      return campos ? `${base} — ${campos}` : base;
    }
  } catch {
    /* corpo não-JSON: cai no genérico. */
  }
  return `HTTP ${status}`;
}
