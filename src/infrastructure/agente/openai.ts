import { ExternalServiceError, type Logger } from '@/core';
import type {
  ChamadaDeFerramenta,
  PedidoAoModelo,
  PortaDeLLM,
  RespostaDoModelo,
} from './porta-llm';

/**
 * A porta falando com a OpenAI (Chat Completions).
 *
 * O único arquivo do agente que conhece um provedor. Trocar por outro é
 * escrever um irmão deste e mudar uma linha na montagem — nada no laço, nada
 * nas ferramentas, nada nos testes do núcleo.
 *
 * Duas coisas moldam o código aqui:
 *
 * 1. **Argumentos de ferramenta chegam como STRING de JSON**, e podem vir
 *    inválidos quando a resposta é cortada. Parsear com cuidado e devolver
 *    objeto vazio é melhor que estourar — o laço trata argumento faltando como
 *    erro de ferramenta, que o modelo lê e corrige.
 *
 * 2. **O cache de prefixo é automático** e vale a partir de ~1024 tokens. Ele
 *    não se pede: se ganha, mantendo o começo da requisição byte a byte igual
 *    entre chamadas. Por isso o prompt de sistema vem primeiro e as ferramentas
 *    em ordem estável — qualquer coisa volátil ali na frente invalida tudo
 *    depois, e o custo por pedido multiplica sem nenhum erro aparecer.
 */

const BASE_PADRAO = 'https://api.openai.com/v1';

interface MensagemOpenAI {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

export class PortaOpenAI implements PortaDeLLM {
  readonly modelo: string;
  private readonly baseUrl: string;

  constructor(
    private readonly opts: {
      apiKey: string;
      modelo?: string;
      logger?: Logger;
      baseUrl?: string;
      /**
       * Teto de tokens por resposta.
       *
       * Generoso de propósito. Medido em produção com `gpt-5-mini`: ele
       * RACIOCINA antes de responder, e o raciocínio sai do mesmo orçamento.
       * Com 1500 ele gastou tudo pensando e devolveu texto VAZIO — o bot
       * emudeceu e a conversa foi parar num humano que não existia.
       *
       * O teto é rede contra resposta fugitiva, não ferramenta de economia.
       * Quem controla custo é o tamanho do prompt e o número de chamadas.
       */
      maxTokensDeSaida?: number;
    },
  ) {
    this.modelo = opts.modelo ?? 'gpt-5-mini';
    this.baseUrl = (opts.baseUrl ?? BASE_PADRAO).replace(/\/$/, '');
  }

  async responder(pedido: PedidoAoModelo): Promise<RespostaDoModelo> {
    const corpo = {
      model: this.modelo,
      messages: [
        // Primeiro e estável: é o começo do prefixo que o cache aproveita.
        { role: 'system' as const, content: pedido.sistema },
        ...pedido.dialogo.map(paraOpenAI),
      ],
      ...(pedido.ferramentas.length > 0
        ? {
            tools: pedido.ferramentas.map((f) => ({
              type: 'function' as const,
              function: { name: f.nome, description: f.descricao, parameters: f.schema },
            })),
          }
        : {}),
      max_completion_tokens: this.opts.maxTokensDeSaida ?? 6000,
    };

    const resposta = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.opts.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(30_000),
    });

    const texto = await resposta.text();

    if (!resposta.ok) {
      this.opts.logger?.error(
        { status: resposta.status, corpo: texto.slice(0, 400) },
        'openai.falhou',
      );
      throw new ExternalServiceError('OpenAI', `HTTP ${resposta.status}`, {
        status: resposta.status,
      });
    }

    let json: {
      choices?: { message?: MensagemOpenAI; finish_reason?: string }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };
    try {
      json = JSON.parse(texto);
    } catch {
      throw new ExternalServiceError('OpenAI', 'resposta ilegível');
    }

    const escolha = json.choices?.[0];
    const mensagem = escolha?.message;

    /*
     * Resposta cortada pelo teto de tokens.
     *
     * Se havia chamada de ferramenta em andamento, os argumentos estão pela
     * metade e são lixo. Registrar é o que permite descobrir depois que o teto
     * está baixo demais — o sintoma sozinho seria o bot "às vezes não entender".
     */
    if (escolha?.finish_reason === 'length') {
      // Sintoma real deste corte: resposta vazia, bot mudo, conversa entregue a
      // um humano. Por isso é `error` e não `warn` — precisa saltar no log.
      this.opts.logger?.error(
        { modelo: this.modelo, saida: json.usage?.completion_tokens },
        'openai.resposta_cortada',
      );
    }

    return {
      texto: mensagem?.content?.trim() || null,
      chamadas: (mensagem?.tool_calls ?? []).map(paraChamada),
      uso: {
        entrada: json.usage?.prompt_tokens ?? 0,
        saida: json.usage?.completion_tokens ?? 0,
        entradaEmCache: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      },
    };
  }
}

function paraOpenAI(fala: PedidoAoModelo['dialogo'][number]): MensagemOpenAI {
  if (fala.papel === 'usuario') return { role: 'user', content: fala.texto };

  if (fala.papel === 'ferramenta') {
    // `tool_call_id` é o que amarra o resultado à chamada. Sem ele, com duas
    // ferramentas em paralelo, a API recusa a requisição inteira.
    return { role: 'tool', tool_call_id: fala.chamadaId, content: fala.conteudo };
  }

  return {
    role: 'assistant',
    content: fala.texto,
    ...(fala.chamadas && fala.chamadas.length > 0
      ? {
          tool_calls: fala.chamadas.map((c) => ({
            id: c.id,
            type: 'function' as const,
            function: { name: c.nome, arguments: JSON.stringify(c.argumentos) },
          })),
        }
      : {}),
  };
}

function paraChamada(bruta: {
  id: string;
  function: { name: string; arguments: string };
}): ChamadaDeFerramenta {
  return {
    id: bruta.id,
    nome: bruta.function.name,
    argumentos: parsearArgumentos(bruta.function.arguments),
  };
}

/**
 * Os argumentos vêm como string, e nem sempre como JSON válido.
 *
 * Acontece quando a resposta é cortada no meio da geração. Objeto vazio faz a
 * ferramenta reclamar de parâmetro faltando — que o modelo lê e corrige na
 * volta seguinte. Estourar aqui mataria a conversa por um token a mais.
 */
function parsearArgumentos(bruto: string): Record<string, unknown> {
  if (!bruto?.trim()) return {};
  try {
    const lido = JSON.parse(bruto);
    return lido && typeof lido === 'object' && !Array.isArray(lido) ? lido : {};
  } catch {
    return {};
  }
}
