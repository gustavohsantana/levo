/**
 * O que dá para saber sobre a conta que o lojista acabou de autorizar.
 *
 * Duas perguntas, e as respostas têm confiabilidade diferente:
 *
 *  1. **Qual conta é esta?** Tem resposta exata. O lojista com conta pessoal e
 *     conta da empresa vai autorizar a errada uma vez, e precisa conseguir
 *     perceber isso sozinho na tela.
 *  2. **Ela consegue receber Pix?** Não tem resposta exata. O Mercado Pago não
 *     expõe endpoint para consultar as chaves Pix de uma conta — o que existe é
 *     o erro `Collector user without key enabled for QR render`, que só aparece
 *     na primeira cobrança. O melhor disponível é olhar os meios de pagamento
 *     habilitados, que é indício e não garantia.
 *
 * Por isso o resultado de Pix é tri-estado, e não booleano: "não" bloqueia a
 * conexão, "talvez" deixa passar com aviso. Tratar indício como certeza aqui
 * significaria recusar a conexão de uma loja que funcionaria — o pior erro
 * possível numa tela de onboarding.
 */
export interface ContaMercadoPago {
  id: string;
  nome: string | null;
  email: string | null;
  /** `null` quando a consulta falhou: desconhecido não é o mesmo que ausente. */
  aceitaPix: boolean | null;
}

const BASE_URL = 'https://api.mercadopago.com';
const TIMEOUT_MS = 8000;

export async function lerContaMercadoPago(accessToken: string): Promise<ContaMercadoPago | null> {
  const usuario = await buscar<{
    id?: number | string;
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }>('/users/me', accessToken);

  // Sem isto não há conta: token revogado pelo lojista, ou vencido sem
  // renovação. Quem chama transforma isso no estado "precisa reconectar".
  if (!usuario?.id) return null;

  return {
    id: String(usuario.id),
    nome: nomeDe(usuario),
    email: usuario.email ?? null,
    aceitaPix: await aceitaPix(accessToken),
  };
}

/**
 * Indício de que a conta consegue emitir Pix.
 *
 * `/v1/payment_methods` responde no contexto do token, então a lista reflete o
 * que aquela conta tem habilitado. Chave Pix ausente costuma aparecer aqui como
 * `pix` fora da lista — mas o inverso não vale: `pix` presente não prova que
 * existe chave cadastrada.
 */
async function aceitaPix(accessToken: string): Promise<boolean | null> {
  const metodos = await buscar<Array<{ id?: string; status?: string }>>(
    '/v1/payment_methods',
    accessToken,
  );

  if (!Array.isArray(metodos)) return null;

  return metodos.some((metodo) => metodo.id === 'pix' && metodo.status !== 'deactive');
}

async function buscar<T>(caminho: string, accessToken: string): Promise<T | null> {
  try {
    const resposta = await fetch(`${BASE_URL}${caminho}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });

    if (!resposta.ok) return null;
    return (await resposta.json()) as T;
  } catch {
    /*
     * Rede fora não pode derrubar a tela de integrações nem recusar um
     * consentimento que estava certo. Quem chama já trata `null` como
     * "desconhecido", que é o que de fato aconteceu.
     */
    return null;
  }
}

function nomeDe(usuario: { nickname?: string; first_name?: string; last_name?: string }) {
  const completo = [usuario.first_name, usuario.last_name].filter(Boolean).join(' ').trim();
  return completo || usuario.nickname || null;
}
