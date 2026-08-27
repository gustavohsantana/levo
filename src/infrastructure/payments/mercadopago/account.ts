/**
 * O que dá para saber sobre a conta do lojista.
 *
 * São duas perguntas, e elas estão em funções separadas porque têm plateias
 * diferentes: quem é a conta importa a cada abertura da tela de Integrações;
 * se ela consegue receber Pix importa uma vez, no consentimento. Juntar as duas
 * fazia a tela pagar por uma chamada de rede que ninguém ia ler.
 */
export interface ContaMercadoPago {
  id: string;
  nome: string | null;
  email: string | null;
}

const BASE_URL = 'https://api.mercadopago.com';
const TIMEOUT_MS = 8000;

/**
 * Quem é a conta autorizada — e, de quebra, se a autorização ainda vale.
 *
 * `null` significa que o Mercado Pago não reconheceu o token: revogado pelo
 * lojista, ou vencido sem renovação possível. Quem chama transforma isso no
 * estado "precisa reconectar", que é a diferença entre o dono saber que o Pix
 * saiu do cardápio e achar que o movimento caiu.
 *
 * O nome e o e-mail existem para o lojista com conta pessoal e conta da empresa
 * perceber sozinho que conectou a errada.
 */
export async function lerContaMercadoPago(accessToken: string): Promise<ContaMercadoPago | null> {
  const usuario = await buscar<{
    id?: number | string;
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }>('/users/me', accessToken);

  if (!usuario?.id) return null;

  return {
    id: String(usuario.id),
    nome: nomeDe(usuario),
    email: usuario.email ?? null,
  };
}

/**
 * Indício de que a conta consegue emitir Pix — e só indício.
 *
 * O Mercado Pago **não expõe endpoint** para consultar as chaves Pix de uma
 * conta. O que existe é o erro `Collector user without key enabled for QR
 * render`, que só aparece na primeira cobrança. `/v1/payment_methods` responde
 * no contexto do token, então a lista reflete o que aquela conta tem
 * habilitado: `pix` fora dela é sinal forte de que falta chave, mas `pix`
 * presente não prova que existe uma.
 *
 * Daí o tri-estado. `null` é "não sei", e quem chama deixa passar: recusar a
 * conexão por desconhecimento barraria um lojista cuja conta funciona, que é o
 * pior erro possível numa tela de onboarding.
 */
export async function contaAceitaPix(accessToken: string): Promise<boolean | null> {
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
