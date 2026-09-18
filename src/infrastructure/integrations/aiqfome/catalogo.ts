import { ExternalServiceError, type Logger } from '@/core';

/**
 * O módulo Cardápio (Menu) do aiqfome — ler e gerir o cardápio pelo Levô.
 *
 * Paralelo do `IfoodCatalog`, contra a API de Menu do aiqfome. Mesma base e
 * mesmo token de lojista do `CredentialStore`.
 *
 * Começando pela LEITURA (`GET /api/v2/menu/:store_id`), que usa o escopo
 * `aqf:menu:read` — já autorizado. As escritas (criar/editar categoria, item,
 * complemento, preço, status) usam escopos `aqf:menu:*` de escrita, que ainda
 * dependem de liberação no app do aiqfome — ver [[aiqfome-write-scope-bloqueado]].
 */

const BASE_PADRAO = 'https://plataforma.aiqfome.com';
const USER_AGENT = 'Levo (contato@levo.app)';

export class AiqfomeCatalogo {
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      accessToken: () => Promise<string>;
      logger?: Logger;
      baseUrl?: string;
    },
  ) {
    this.baseUrl = (opts.baseUrl ?? BASE_PADRAO).replace(/\/$/, '');
  }

  /** O cardápio inteiro da loja (árvore de categorias e itens), cru. */
  cardapio(storeId: string): Promise<unknown> {
    return this.req<unknown>('GET', `/api/v2/menu/${storeId}`);
  }

  /** Liga/desliga a disponibilidade de um item (toggle). Sem corpo. */
  alternarItem(storeId: string, itemUuid: string): Promise<void> {
    return this.req<void>(
      'PUT',
      `/api/v2/menu/${storeId}/items/${itemUuid}/toggle-status`,
    );
  }

  /** Liga/desliga a disponibilidade de uma categoria (toggle). Sem corpo. */
  alternarCategoria(storeId: string, categoryId: string): Promise<void> {
    return this.req<void>(
      'PUT',
      `/api/v2/menu/${storeId}/categories/${categoryId}/toggle-status`,
    );
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
        accept: 'application/json',
        'user-agent': USER_AGENT,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const detalhe = await response.text().catch(() => '');
      this.opts.logger?.warn(
        { path, status: response.status, detalhe },
        'aiqfome.catalogo_falhou',
      );
      throw new ExternalServiceError('aiqfome', mensagemDoErro(detalhe, response.status), {
        path,
        status: response.status,
      });
    }

    const texto = await response.text();
    if (!texto) return undefined as T;
    const json = JSON.parse(texto);
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }
}

function mensagemDoErro(corpo: string, status: number): string {
  try {
    const j = JSON.parse(corpo);
    const msg = j?.data?.message ?? j?.message;
    if (msg) return String(msg);
  } catch {
    /* corpo não-JSON */
  }
  return `HTTP ${status}`;
}
