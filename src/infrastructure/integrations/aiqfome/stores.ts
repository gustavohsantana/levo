import { env } from '@/env';

export interface AiqfomeStore {
  id: string;
  nome: string;
}

/**
 * As lojas que o consentimento liberou.
 *
 * O token do aiqfome é por loja, mas um lojista pode autorizar mais de uma na
 * mesma conta — por isso a resposta é lista. Sem consultar isto o `merchantId`
 * ficaria vazio e a importação não teria o que passar em `filter[store_ids]`,
 * falhando de um jeito que só apareceria quando o primeiro pedido não entrasse.
 */
export async function listarLojasAiqfome(accessToken: string): Promise<AiqfomeStore[]> {
  const base = env().AIQFOME_BASE_URL ?? 'https://plataforma.aiqfome.com';

  try {
    const resposta = await fetch(new URL('/api/v2/store', base), {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        'user-agent': 'Levo (contato@levoentregas.com.br)',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!resposta.ok) return [];

    const payload = (await resposta.json()) as { data?: Array<{ id: number; name?: string }> };
    return (payload.data ?? []).map((loja) => ({
      id: String(loja.id),
      nome: loja.name ?? String(loja.id),
    }));
  } catch {
    // Falhar aqui não invalida o consentimento: a credencial é gravada mesmo
    // assim e a loja pode ser escolhida depois, na tela.
    return [];
  }
}
