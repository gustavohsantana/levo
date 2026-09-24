import type { Logger } from '@/core';
import { Agente } from '@/infrastructure/agente/agente';
import type { FalaDoDialogo } from '@/infrastructure/agente/porta-llm';
import type { Ferramenta } from '@/infrastructure/agente/ferramenta';
import type { PortaDeLLM } from '@/infrastructure/agente/porta-llm';
import type { MensagemRecebida } from '../webhook-protocol';
import { avancar, type Retrato } from './motor';
import { lerEstado, type EstadoDaConversa } from './estado';
import { carimbo, texto, type MensagemDeSaida } from './mensagem-de-saida';

/**
 * Onde o determinístico e o agente se encontram.
 *
 * O motor é puro e o agente faz rede — juntar os dois é papel desta camada, que
 * é a única aqui que conhece banco, relógio e API externa.
 *
 * A ordem importa e é o que segura o custo:
 *
 *   1. o motor decide (grátis, previsível, testado)
 *   2. **só se ele declarar que não sabe**, o agente entra
 *
 * Enquanto o cliente toca em botões, o passo 2 nunca acontece.
 */

export interface ContextoDoAtendimento {
  /** O estado gravado, cru do banco. `null` quando é conversa nova. */
  estadoGravado: unknown;
  retrato: Retrato;
  /** Ausente quando o agente está desligado — aí o motor responde sozinho. */
  agente?: {
    porta: PortaDeLLM;
    sistema: string;
    ferramentas: Ferramenta[];
  };
  logger?: Logger;
}

export interface Atendimento {
  respostas: MensagemDeSaida[];
  estado: EstadoDaConversa;
  /** O diálogo com o modelo, para gravar e continuar no próximo turno. */
  dialogoDoAgente: FalaDoDialogo[];
  /** Tokens gastos. Zero quando o agente não foi chamado. */
  custo: { entrada: number; saida: number; entradaEmCache: number };
}

/**
 * Quantas falas do diálogo carregar adiante.
 *
 * Eram 12, e foi pouco: numa conversa real de 69 mensagens o cliente passou
 * rua, número, bairro e cidade, e o bot pediu tudo de novo — porque cada
 * rodada de ferramenta ocupa duas falas, e 12 viravam quatro turnos de verdade.
 *
 * Quarenta cobre um pedido inteiro com folga. O que mantém isso barato não é o
 * número: é a poda dos resultados de ferramenta, logo abaixo.
 */
const MEMORIA_DE_FALAS = 40;

/**
 * Quantas rodadas recentes mantêm os resultados de ferramenta.
 *
 * O que o cliente DISSE (endereço, sabor, quantidade) precisa sobreviver a
 * conversa inteira. O JSON que uma ferramenta devolveu dez turnos atrás, não —
 * ele é volumoso e o modelo já usou. Guardar os dois do mesmo jeito faz o custo
 * crescer com o quadrado da conversa sem ganho nenhum de memória.
 */
const RODADAS_COM_FERRAMENTA = 3;

/**
 * Quanto tempo o bot fica calado depois de entregar a conversa a um humano.
 *
 * Deveria ser "até o atendente devolver" — mas a caixa de entrada no painel
 * ainda não existe, então ninguém devolve, e sem prazo a conversa morre ali.
 * Medido em produção: foi exatamente o que aconteceu no primeiro teste longo.
 *
 * Quatro horas é o meio-termo honesto: cobre um plantão, e não deixa o cliente
 * que voltou no dia seguinte falando com uma parede.
 *
 * ⚠️ Isto é remendo. A correção é a caixa de entrada — e quando ela existir,
 * quem devolve a conversa é o atendente, não o relógio.
 */
const SILENCIO_MAXIMO_MS = 4 * 60 * 60 * 1000;

export async function atender(
  msg: MensagemRecebida,
  ctx: ContextoDoAtendimento,
  dialogoAnterior: FalaDoDialogo[] = [],
): Promise<Atendimento> {
  const guardado = lerEstado(ctx.estadoGravado);

  /*
   * Passou o prazo do silêncio: o bot volta a atender.
   *
   * Sem isto, `com_atendente` é uma porta que só abre para dentro.
   */
  const estadoAtual =
    guardado.passo === 'com_atendente' && silencioVenceu(guardado, ctx.retrato.agora)
      ? { ...guardado, passo: 'ocioso' as const }
      : guardado;

  const passo = avancar(estadoAtual, msg, ctx.retrato);

  /*
   * Já estava com atendente: silêncio de VERDADE.
   *
   * O motor devolve vazio de propósito nestes turnos. Tratar vazio como "não
   * tenho o que dizer" e mandar a desculpa fez o bot repetir a mesma frase a
   * cada mensagem — medido em produção, e é pior que não responder.
   *
   * Só engole a resposta se a conversa JÁ estava com humano. Confirmar o
   * pedido e pedir atendente ENTRAM neste passo com uma despedida; se
   * engolíssemos também esses, o cliente tocaria em Confirmar e o WhatsApp
   * ficaria mudo.
   */
  if (estadoAtual.passo === 'com_atendente' && passo.estado.passo === 'com_atendente') {
    return {
      respostas: [],
      estado: passo.estado,
      dialogoDoAgente: dialogoAnterior,
      custo: { entrada: 0, saida: 0, entradaEmCache: 0 },
    };
  }

  if (!passo.delegarAoAgente || !ctx.agente) {
    /*
     * Ou o determinístico soube responder, ou o agente está desligado.
     *
     * Desligado responde uma frase honesta em vez de silêncio: cliente sem
     * resposta liga no telefone, que é o que o Levô existe para evitar.
     */
    const respostas =
      passo.respostas.length > 0
        ? passo.respostas
        : [texto(desculpaHonesta(estadoAtual, ctx.retrato))];

    return {
      respostas,
      estado: passo.estado,
      dialogoDoAgente: dialogoAnterior,
      custo: { entrada: 0, saida: 0, entradaEmCache: 0 },
    };
  }

  const agente = new Agente({
    porta: ctx.agente.porta,
    sistema: ctx.agente.sistema,
    ferramentas: ctx.agente.ferramentas,
    logger: ctx.logger,
  });

  const entrada: FalaDoDialogo[] = [
    ...memoriaDoPedido(passo.estado),
    ...podar(dialogoAnterior),
    { papel: 'usuario', texto: msg.texto ?? '' },
  ];

  try {
    const r = await agente.responder(entrada);

    /*
     * ⭐ Valor sem procedência barra a resposta.
     *
     * Aqui, e não dentro do agente, porque só esta camada sabe o que está em
     * jogo. Um preço inventado que chega ao cliente vira pedido com o valor
     * errado — e quem paga a diferença é o lojista, que descobre no fim do mês
     * sem saber a origem.
     *
     * Chamar um humano é pior que responder certo e melhor que responder
     * errado sobre dinheiro.
     */
    if (r.valoresSuspeitos.length > 0) {
      ctx.logger?.error(
        { valores: r.valoresSuspeitos, texto: r.texto },
        'agente.valor_sem_procedencia',
      );
      return {
        respostas: [texto(CHAMAR_HUMANO)],
        estado: { ...passo.estado, passo: 'com_atendente' },
        dialogoDoAgente: dialogoAnterior,
        custo: r.uso,
      };
    }

    /*
     * Laço estourado, ou resposta vazia.
     *
     * Vazio quase sempre é resposta cortada pelo teto de tokens — e o sintoma
     * (bot mudo) não aponta para a causa. Registrar separado é o que permite
     * descobrir isso sem precisar de um teste longo em produção.
     */
    if (r.fim === 'teto' || !r.texto.trim()) {
      ctx.logger?.error(
        { fim: r.fim, iteracoes: r.iteracoes, saida: r.uso.saida },
        r.fim === 'teto' ? 'agente.teto' : 'agente.resposta_vazia',
      );
      return {
        respostas: [texto(CHAMAR_HUMANO)],
        estado: { ...passo.estado, passo: 'com_atendente' },
        dialogoDoAgente: semMemoriaInjetada(r.dialogo),
        custo: r.uso,
      };
    }

    return {
      respostas: [texto(r.texto)],
      estado: colherDoDialogo(passo.estado, r.dialogo),
      dialogoDoAgente: semMemoriaInjetada(r.dialogo),
      custo: r.uso,
    };
  } catch (cause) {
    /*
     * Provedor fora do ar, chave vencida, tempo esgotado. O cliente não pode
     * levar silêncio por causa disso — e o erro precisa ficar no log com nome,
     * porque o sintoma ("o bot parou de responder") não aponta para a causa.
     */
    ctx.logger?.error({ cause: String(cause) }, 'agente.indisponivel');
    return {
      respostas: [texto(CHAMAR_HUMANO)],
      estado: { ...passo.estado, passo: 'com_atendente' },
      dialogoDoAgente: dialogoAnterior,
      custo: { entrada: 0, saida: 0, entradaEmCache: 0 },
    };
  }
}

const CHAMAR_HUMANO =
  'Deixa eu chamar alguém da loja para te ajudar com isso. Um instante! 🙂';

function silencioVenceu(estado: EstadoDaConversa, agora: Date): boolean {
  return agora.getTime() - new Date(estado.atualizadoEm).getTime() > SILENCIO_MAXIMO_MS;
}

function desculpaHonesta(estado: EstadoDaConversa, retrato: Retrato): string {
  const nome = retrato.nomeDaLoja[estado.lojaEmFoco ?? ''] ?? 'a loja';
  return (
    `${carimbo(nome)}\n\n` +
    'Oi! 👋 Recebi sua mensagem. O atendimento automático ainda está sendo ' +
    'montado por aqui — já chamei alguém da loja para te responder.'
  );
}

/**
 * O que já foi combinado, injetado no diálogo.
 *
 * Medido em produção: o cliente montou um açaí (500ml, ninho, banana, morango,
 * kiwi), passou o endereço, e dez turnos depois o bot perguntou "o que você
 * quer pedir?". A poda tinha comido o diálogo; o carrinho no estado estava
 * vazio porque ninguém o preenchia.
 *
 * Isto não vai no prompt de sistema — o prefixo precisa ser estável para o
 * cache. Vai como fala, depois da poda, para o modelo reler o combinado.
 */
function memoriaDoPedido(estado: EstadoDaConversa): FalaDoDialogo[] {
  const partes: string[] = [];
  if (estado.entrega) partes.push(`modalidade: ${estado.entrega}`);
  if (estado.endereco) partes.push(`endereço: ${estado.endereco}`);
  if (estado.carrinho.length > 0) {
    const itens = estado.carrinho
      .map((i) => {
        const extras = i.opcoes.length > 0 ? ` (${i.opcoes.join(', ')})` : '';
        return `${i.quantidade}× ${i.nome}${extras}`;
      })
      .join('; ');
    partes.push(`carrinho: ${itens}`);
  }
  if (partes.length === 0) return [];

  return [
    {
      papel: 'usuario',
      texto:
        `[já combinado nesta conversa — use, não leia em voz alta, não pergunte de novo] ${partes.join('. ')}.`,
    },
  ];
}

function semMemoriaInjetada(dialogo: FalaDoDialogo[]): FalaDoDialogo[] {
  return dialogo.filter(
    (f) => !(f.papel === 'usuario' && (f.texto ?? '').includes('[já combinado nesta conversa')),
  );
}

/**
 * Puxa carrinho e endereço das ferramentas que o modelo acabou de chamar.
 *
 * Sem isto a memória acima nunca nasce: o agente fala do açaí, mas o estado
 * continua com carrinho vazio, e a próxima poda apaga a fala.
 */
function colherDoDialogo(estado: EstadoDaConversa, dialogo: FalaDoDialogo[]): EstadoDaConversa {
  const next = { ...estado, carrinho: [...estado.carrinho] };

  for (const fala of dialogo) {
    if (fala.papel !== 'ferramenta') continue;
    let parsed: { ok?: boolean; dados?: Record<string, unknown> };
    try {
      parsed = JSON.parse(fala.conteudo) as { ok?: boolean; dados?: Record<string, unknown> };
    } catch {
      continue;
    }
    if (!parsed.ok || !parsed.dados) continue;
    const d = parsed.dados;

    if (fala.nome === 'precificar_item' && typeof d.nome === 'string') {
      next.carrinho = [
        {
          productId: typeof d.produtoId === 'string' ? d.produtoId : '',
          nome: d.nome,
          quantidade: Math.max(1, Number(d.quantidade ?? 1) || 1),
          precoUnitarioCents: Number(d.precoUnitarioCents ?? 0) || 0,
          opcoes: Array.isArray(d.opcoesEscolhidas)
            ? d.opcoesEscolhidas.filter((x): x is string => typeof x === 'string')
            : [],
        },
      ];
    }

    if (fala.nome === 'consultar_cep') {
      const rua = typeof d.rua === 'string' ? d.rua : '';
      const bairro = typeof d.bairro === 'string' ? d.bairro : '';
      const cidade = typeof d.cidade === 'string' ? d.cidade : '';
      const pedacos = [rua, bairro, cidade].filter(Boolean);
      if (pedacos.length > 0) next.endereco = pedacos.join(', ');
    }
  }

  return next;
}

/**
 * Corta a conversa velha antes de mandar ao modelo.
 *
 * Todo turno reenvia o diálogo inteiro, então sem poda o custo cresce com o
 * quadrado do tamanho da conversa. Doze turnos cobrem um pedido com folga; o
 * que passa disso é conversa que já deveria ter ido para um humano.
 *
 * Corta pelo começo para o contexto recente sobreviver — que é o que importa
 * para o próximo passo.
 */
function podar(dialogo: FalaDoDialogo[]): FalaDoDialogo[] {
  const recente = semMemoriaInjetada(dialogo).slice(-MEMORIA_DE_FALAS);

  /*
   * Onde começam as rodadas que mantêm ferramenta.
   *
   * Contado de trás para frente pelas falas do cliente: cada uma marca uma
   * rodada. Antes desse ponto, sobra só o que foi dito em palavras.
   */
  let rodadas = 0;
  let corte = 0;
  for (let i = recente.length - 1; i >= 0; i -= 1) {
    if (recente[i].papel === 'usuario') {
      rodadas += 1;
      if (rodadas > RODADAS_COM_FERRAMENTA) {
        corte = i + 1;
        break;
      }
    }
  }

  const enxuto = recente.map((fala, i) => {
    if (i >= corte) return fala;

    // Fora da janela recente: some com o retorno da ferramenta...
    if (fala.papel === 'ferramenta') return null;

    /*
     * ...e com a chamada que o pediu. Tem que ser junto: assistente com
     * `tool_calls` sem o resultado correspondente faz a API recusar a
     * requisição INTEIRA — não é opcional.
     */
    if (fala.papel === 'assistente' && fala.chamadas?.length) {
      return fala.texto ? { papel: 'assistente' as const, texto: fala.texto } : null;
    }

    return fala;
  });

  const cortado = enxuto.filter((f): f is FalaDoDialogo => f !== null);

  // Órfão no começo pelo mesmo motivo de sempre.
  while (cortado.length > 0 && cortado[0].papel === 'ferramenta') cortado.shift();

  return cortado;
}
