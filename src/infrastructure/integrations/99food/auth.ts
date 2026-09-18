import { ExternalServiceError, type Logger } from '@/core';

/**
 * Autorização do 99Food (DiDi Food Open Platform).
 *
 * Diferente do iFood e do aiqfome em dois pontos que mudam o desenho:
 *
 * 1. O token é **por loja**, não por conta. Quem identifica a loja é o
 *    `app_shop_id` — e ele é o id da loja **no nosso sistema**, não no deles.
 *    Nós escolhemos o valor; a página de autorização é que amarra a loja real
 *    do lojista a esse id.
 *
 * 2. O token viaja em **query string**, não em header. É a API deles que manda,
 *    e é por isso que `comToken` existe: centralizar essa esquisitice num lugar
 *    só, em vez de espalhar `?auth_token=` por cada chamada.
 *
 * A renovação automática ao receber "token expirado" é item **obrigatório** da
 * homologação — ver [[99food-api]].
 */

const BASE_PADRAO = 'https://openapi.didi-food.com';

/** O envelope que toda resposta da plataforma usa. */
interface RespostaPadrao<T> {
  errno: number;
  errmsg?: string;
  data?: T;
}

export interface TokenDaLoja {
  /** O segredo da loja, usado como `auth_token` nas demais chamadas. */
  authToken: string;
  /** Quando expira. `null` quando a plataforma não informa. */
  expiraEm: Date | null;
}

export class Food99Auth {
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      /** APP ID do app no portal do 99Food. É um long de 19 dígitos. */
      appId: string;
      appSecret: string;
      logger?: Logger;
      baseUrl?: string;
    },
  ) {
    this.baseUrl = (opts.baseUrl ?? BASE_PADRAO).replace(/\/$/, '');
  }

  /**
   * O token atual da loja, renovando a autorização se preciso.
   *
   * São DUAS chamadas, e a ordem importa: `refresh` renova a autorização mas
   * **não devolve token nenhum** — responde `errno: 0` com `data` vazio. Quem
   * entrega o token é sempre o `get`.
   *
   * Isso não está na especificação; foi medido contra a API deles. A primeira
   * versão daqui devolvia o resultado do `refresh` direto e teria estourado
   * "resposta sem auth_token" justamente no caso que ela existe para resolver:
   * a autorização vencida (`errno 10102`).
   */
  async token(appShopId: string): Promise<TokenDaLoja> {
    try {
      return await this.buscarToken('get', appShopId);
    } catch (cause) {
      /*
       * "Ainda não existe" (10101) e "expirou" (10102) chegam como erro do
       * `get`, e a saída dos dois é a mesma: renovar e pedir de novo. Tentar
       * distinguir pelo texto amarraria o código à redação da mensagem deles.
       */
      this.opts.logger?.warn({ cause: String(cause) }, '99food.token_get_falhou_tentando_refresh');
      await this.renovar(appShopId);
      return this.buscarToken('get', appShopId);
    }
  }

  /**
   * Renova a autorização da loja. Não devolve token — quem devolve é o `get`.
   */
  async renovar(appShopId: string): Promise<void> {
    await this.chamar('refresh', appShopId);
  }

  /** A chamada crua. Valida transporte e `errno`, mas não exige token. */
  private async chamar(
    acao: 'get' | 'refresh',
    appShopId: string,
  ): Promise<RespostaPadrao<{ auth_token?: string; token_expiration_time?: number }>> {
    const url = new URL(`${this.baseUrl}/v1/auth/authtoken/${acao}`);
    url.searchParams.set('app_id', this.opts.appId);
    url.searchParams.set('app_secret', this.opts.appSecret);
    url.searchParams.set('app_shop_id', appShopId);

    const resposta = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    const texto = await resposta.text();
    if (!resposta.ok) {
      throw new ExternalServiceError('99Food', mensagemDoErro(texto, resposta.status), {
        path: `/v1/auth/authtoken/${acao}`,
        status: resposta.status,
      });
    }

    const corpo = JSON.parse(texto) as RespostaPadrao<{
      auth_token?: string;
      token_expiration_time?: number;
    }>;

    /*
     * HTTP 200 com `errno` diferente de zero é falha. A plataforma responde 200
     * para erro de negócio, e olhar só o status deixaria passar adiante um
     * "autorização vencida" como se fosse sucesso.
     */
    if (corpo.errno !== 0) {
      throw new ExternalServiceError('99Food', corpo.errmsg ?? `errno ${corpo.errno}`, {
        path: `/v1/auth/authtoken/${acao}`,
        errno: corpo.errno,
      });
    }

    return corpo;
  }

  private async buscarToken(
    acao: 'get' | 'refresh',
    appShopId: string,
  ): Promise<TokenDaLoja> {
    const corpo = await this.chamar(acao, appShopId);

    // Token vazio com `errno: 0` é o que o `refresh` devolve. Aqui é falha:
    // quem chama `buscarToken` quer o token, não a confirmação.
    if (!corpo.data?.auth_token) {
      throw new ExternalServiceError('99Food', 'resposta sem auth_token', {
        path: `/v1/auth/authtoken/${acao}`,
        errno: corpo.errno,
      });
    }

    return {
      authToken: corpo.data.auth_token,
      expiraEm: paraData(corpo.data.token_expiration_time),
    };
  }
}

/**
 * Acrescenta o `auth_token` na query — é assim que a plataforma autentica.
 *
 * Existe como função separada para que o dia em que eles mudarem para header
 * seja uma linha, e não uma caçada por todas as chamadas.
 */
export function comToken(url: URL, authToken: string): URL {
  url.searchParams.set('auth_token', authToken);
  return url;
}

/**
 * `token_expiration_time` chega como epoch — em segundos ou milissegundos,
 * dependendo do endpoint. Um epoch em segundos interpretado como ms cairia em
 * 1970 e faria o token ser tratado como vencido a cada chamada.
 */
function paraData(epoch: number | undefined): Date | null {
  if (!epoch || !Number.isFinite(epoch)) return null;
  const ms = epoch > 1e12 ? epoch : epoch * 1000;
  return new Date(ms);
}

function mensagemDoErro(corpo: string, status: number): string {
  try {
    const j = JSON.parse(corpo) as RespostaPadrao<unknown>;
    if (j?.errmsg) return j.errno ? `${j.errno}: ${j.errmsg}` : j.errmsg;
  } catch {
    /* corpo não-JSON */
  }
  return `HTTP ${status}`;
}
