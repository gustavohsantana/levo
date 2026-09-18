import { ExternalServiceError, type Logger } from '@/core';

/**
 * O módulo Loja do aiqfome — gerir a loja de dentro do Levô.
 *
 * O paralelo do `IfoodMerchant`, mas contra a API do aiqfome (Magalu). Mesma
 * base e mesmo token de lojista do `CredentialStore`; o que muda é o formato.
 *
 * Duas diferenças de modelo que a tela precisa respeitar:
 *
 *  - Disponibilidade é um TOGGLE, não uma pausa com janela de tempo. O aiqfome
 *    tem `open` / `stand-by` / `close` — abrir, pausar (fica em espera) e
 *    fechar — em vez das `interruptions` datadas do iFood.
 *  - Horário é UMA faixa por dia da semana (`"HH:MM - HH:MM"`), não vários
 *    turnos. `week_day_number` vai de 1 (segunda) a 7 (domingo).
 *
 * As formas vêm da doc (developer.aiqfome.com) e foram conferidas ao vivo contra
 * a loja de teste: `/info` e `/working-hours` respondem `{ data: ... }`; as
 * escritas (`open`/`stand-by`/`close`, e o POST de horário) devolvem 204 vazio.
 */

const BASE_PADRAO = 'https://plataforma.aiqfome.com';

/*
 * O aiqfome exige `User-Agent` em toda chamada — a doc pede o formato
 * "nome (email)". Sem ele, parte das rotas responde 400/403.
 */
const USER_AGENT = 'Levo (contato@levo.app)';

export interface LojaAiqfome {
  id: number;
  name: string;
  [k: string]: unknown;
}

/** Um dia de funcionamento como o `GET working-hours` devolve (leitura). */
export interface TurnoAiqfome {
  /** 1 (segunda) … 7 (domingo). */
  week_day_number: number;
  /** "HH:MM - HH:MM". */
  hours: string;
  /** 1 = aberto nesse dia, 0 = fechado. */
  status: number;
}

/**
 * Um dia como o `POST working-hours` EXIGE (escrita) — formato diferente da
 * leitura: precisa de `week_day_name` e `hours` é um objeto com `first_period`.
 */
export interface HorarioEscritaAiqfome {
  week_day_number: number;
  /** Nome do dia ("segunda" … "domingo"). Obrigatório no create. */
  week_day_name: string;
  /** 1 = aberto, 0 = fechado. */
  status: number;
  hours: { first_period: string; second_period?: string };
}

export class AiqfomeLoja {
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      /** Token válido de UM lojista, do `CredentialStore`. Renova sozinho. */
      accessToken: () => Promise<string>;
      logger?: Logger;
      baseUrl?: string;
    },
  ) {
    this.baseUrl = (opts.baseUrl ?? BASE_PADRAO).replace(/\/$/, '');
  }

  // ---- Cenário 1: informações da loja ----

  /** Detalhes completos da loja (nome, documento, tempos de preparo/entrega). */
  detalhes(storeId: string): Promise<LojaAiqfome> {
    return this.req<LojaAiqfome>('GET', `/api/v2/store/${storeId}/info`);
  }

  // ---- Cenário 2: disponibilidade (toggle) ----

  /** Reabre a loja — volta a receber pedido agora. */
  abrir(storeId: string): Promise<void> {
    return this.req<void>('POST', '/api/v2/store/open', { store_id: Number(storeId) });
  }

  /** Coloca a loja em espera (stand-by) — pausa temporária. */
  pausar(storeId: string): Promise<void> {
    return this.req<void>('POST', '/api/v2/store/stand-by', { store_id: Number(storeId) });
  }

  /** Fecha a loja — deixa de receber pedido até reabrir. */
  fechar(storeId: string): Promise<void> {
    return this.req<void>('POST', '/api/v2/store/close', { store_id: Number(storeId) });
  }

  // ---- Cenário 3: horário de funcionamento ----

  horarios(storeId: string): Promise<TurnoAiqfome[]> {
    return this.req<TurnoAiqfome[]>('GET', `/api/v2/store/${storeId}/working-hours`);
  }

  /** Substitui TODOS os horários: manda os 7 dias de uma vez. */
  definirHorarios(storeId: string, dias: HorarioEscritaAiqfome[]): Promise<void> {
    return this.req<void>('POST', `/api/v2/store/${storeId}/working-hours`, {
      working_hours: dias,
    });
  }

  private async req<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
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
        'aiqfome.loja_falhou',
      );
      throw new ExternalServiceError('aiqfome', mensagemDoErro(detalhe, response.status), {
        path,
        status: response.status,
      });
    }

    // 204 (escritas) e respostas vazias não têm corpo.
    const texto = await response.text();
    if (!texto) return undefined as T;

    /*
     * O aiqfome envelopa as leituras em `{ data: ... }`. Desembrulhar aqui deixa
     * o resto do código lidar com o objeto direto, como o adapter de pedidos.
     */
    const json = JSON.parse(texto);
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }
}

/**
 * O erro do aiqfome vem como `{ success:false, data:{ message } }` — extrai o
 * legível. Foi o corpo que mostrou, na sondagem, que rota errada devolve
 * "The route ... could not be found", não só um 404 seco.
 */
function mensagemDoErro(corpo: string, status: number): string {
  try {
    const j = JSON.parse(corpo);
    const msg = j?.data?.message ?? j?.message;
    if (msg) return String(msg);
  } catch {
    /* corpo não-JSON: cai no genérico. */
  }
  return `HTTP ${status}`;
}
