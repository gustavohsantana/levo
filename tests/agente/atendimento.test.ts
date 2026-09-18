import { describe, expect, it, vi } from 'vitest';
import { atender } from '@/infrastructure/integrations/whatsapp/conversa/atendimento';
import { deuCerto, type Ferramenta } from '@/infrastructure/agente/ferramenta';
import type { PortaDeLLM, RespostaDoModelo } from '@/infrastructure/agente/porta-llm';
import type { Retrato } from '@/infrastructure/integrations/whatsapp/conversa/motor';
import type { MensagemRecebida } from '@/infrastructure/integrations/whatsapp/webhook-protocol';

/**
 * A junção do determinístico com o agente.
 *
 * O que se prova aqui é a economia e a segurança: o agente só é chamado quando
 * o motor declara que não sabe, e a resposta dele é barrada quando cita valor
 * que nenhuma ferramenta devolveu.
 */

const ZE = 'loja-ze';

function retrato(over: Partial<Retrato> = {}): Retrato {
  return {
    agora: new Date('2026-09-17T19:00:00Z'),
    resolucao: { tipo: 'loja', establishmentId: ZE, via: 'codigo' },
    nomeDaLoja: { [ZE]: 'Pizzaria do Zé' },
    slugDaLoja: { [ZE]: 'pizzariadoze' },
    pedidosEmAndamento: [],
    ...over,
  };
}

function msg(texto: string): MensagemRecebida {
  return {
    id: 'wamid.X',
    de: '553591398956',
    nome: 'Gustavo',
    tipo: 'text',
    texto,
    opcaoId: null,
    em: new Date(),
    paraNumeroId: '1',
  };
}

function porta(resposta: Partial<RespostaDoModelo>): PortaDeLLM & { chamou: number } {
  const p = {
    modelo: 'falso',
    chamou: 0,
    async responder(): Promise<RespostaDoModelo> {
      p.chamou += 1;
      return {
        texto: resposta.texto ?? null,
        chamadas: resposta.chamadas ?? [],
        uso: resposta.uso ?? { entrada: 500, saida: 100, entradaEmCache: 400 },
      };
    },
  };
  return p;
}

const FERRAMENTA: Ferramenta = {
  nome: 'preco',
  descricao: 'preço',
  schema: { type: 'object' },
  executar: async () => deuCerto({ precoCents: 6500 }),
};

describe('quando o agente entra', () => {
  it('não é chamado se o motor soube responder', async () => {
    /*
     * A economia do híbrido em um teste: enquanto o cliente toca em botões e o
     * determinístico dá conta, nenhum token é gasto.
     */
    const p = porta({ texto: 'não deveria ser chamado' });

    const r = await atender(msg('oi'), {
      estadoGravado: null,
      // Sem loja definida, o motor pergunta o nome — e sabe a resposta.
      retrato: retrato({ resolucao: { tipo: 'desconhecida' } }),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    expect(p.chamou).toBe(0);
    expect(r.custo).toEqual({ entrada: 0, saida: 0, entradaEmCache: 0 });
    expect(r.respostas[0]).toMatchObject({ tipo: 'texto' });
  });

  it('é chamado quando o motor declara que não sabe', async () => {
    const p = porta({ texto: 'Temos pizzas e bebidas. Quer ver?' });

    const r = await atender(msg('o que vocês têm?'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [FERRAMENTA] },
    });

    expect(p.chamou).toBe(1);
    expect(r.respostas[0]).toMatchObject({ corpo: 'Temos pizzas e bebidas. Quer ver?' });
    expect(r.custo.entrada).toBe(500);
  });

  it('⭐ preço dito SEM chamar ferramenta é barrado, por mais certo que pareça', async () => {
    /*
     * Descoberto escrevendo este arquivo: um modelo que responde "R$ 65,00"
     * direto, sem consultar nada, é barrado — e tem que ser. O valor até podia
     * estar certo naquele dia; o problema é que nada garante que continue certo
     * amanhã, quando o lojista reajustar o cardápio.
     *
     * Aterramento não é sobre o modelo errar a conta. É sobre ele responder de
     * memória em vez de olhar.
     */
    const p = porta({ texto: 'A calabresa sai por R$ 65,00.' });

    const r = await atender(msg('quanto é a calabresa?'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [FERRAMENTA] },
    });

    expect(JSON.stringify(r.respostas)).not.toContain('65,00');
    expect(r.estado.passo).toBe('com_atendente');
  });

  it('desligado, responde com honestidade em vez de silêncio', async () => {
    // Cliente sem resposta liga no telefone — que é o que o Levô evita.
    const r = await atender(msg('quanto é a calabresa?'), {
      estadoGravado: null,
      retrato: retrato(),
      // sem `agente`
    });

    expect(r.respostas).toHaveLength(1);
    expect(r.respostas[0]).toMatchObject({ tipo: 'texto' });
    expect(JSON.stringify(r.respostas[0])).toContain('chamei alguém da loja');
  });
});

describe('barreiras antes de falar com o cliente', () => {
  it('⭐ valor sem procedência não chega ao cliente', async () => {
    /*
     * O modelo respondeu um preço que nenhuma ferramenta devolveu. Se isso
     * passasse, viraria pedido com valor errado — e quem paga a diferença é o
     * lojista, que descobre no fim do mês sem saber a origem.
     */
    const p = porta({ texto: 'Hoje tem promoção: R$ 29,90!' });

    const r = await atender(msg('tem promoção?'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [FERRAMENTA] },
    });

    expect(JSON.stringify(r.respostas)).not.toContain('29,90');
    expect(JSON.stringify(r.respostas)).toContain('chamar alguém da loja');
    // E a conversa passa para humano, em vez de o bot seguir inventando.
    expect(r.estado.passo).toBe('com_atendente');
  });

  it('modelo que se perde no laço entrega para humano', async () => {
    const p = porta({ chamadas: [{ id: 'c', nome: 'preco', argumentos: {} }] });

    const r = await atender(msg('oi'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [FERRAMENTA] },
    });

    expect(r.estado.passo).toBe('com_atendente');
    expect(JSON.stringify(r.respostas)).toContain('chamar alguém da loja');
  });

  it('provedor fora do ar não deixa o cliente sem resposta', async () => {
    const quebrada: PortaDeLLM = {
      modelo: 'falso',
      responder: async () => {
        throw new Error('503');
      },
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

    const r = await atender(msg('oi'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: quebrada, sistema: 's', ferramentas: [] },
      logger: logger as never,
    });

    expect(JSON.stringify(r.respostas)).toContain('chamar alguém da loja');
    // O sintoma ("o bot parou") não aponta a causa — ela precisa ir ao log.
    expect(logger.error).toHaveBeenCalledWith(expect.anything(), 'agente.indisponivel');
  });
});

describe('memória da conversa', () => {
  it('⭐ guarda o que o cliente DISSE e joga fora o JSON velho de ferramenta', async () => {
    /*
     * Medido em conversa real de 69 mensagens: o cliente passou rua, número,
     * bairro e cidade, e o bot pediu tudo de novo — a poda por contagem simples
     * tinha comido o endereço, porque cada rodada de ferramenta ocupa duas
     * falas.
     *
     * A poda agora é assimétrica: palavra do cliente sobrevive, resultado de
     * ferramenta antigo não. Ele é volumoso e o modelo já usou.
     */
    let recebido: unknown[] = [];
    const p: PortaDeLLM = {
      modelo: 'falso',
      async responder(pedido) {
        recebido = pedido.dialogo;
        return { texto: 'ok', chamadas: [], uso: { entrada: 1, saida: 1, entradaEmCache: 0 } };
      },
    };

    const longo = Array.from({ length: 30 }, (_, i) =>
      i % 3 === 2
        ? ({ papel: 'ferramenta', chamadaId: `c${i}`, nome: 'x', conteudo: '{}' } as const)
        : ({ papel: 'usuario', texto: `t${i}` } as const),
    );

    await atender(msg('e agora?'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    }, longo);

    // Muito menor que os 31 que entrariam sem poda.
    // O que o cliente disse lá atrás continua ali.
    const textos = recebido
      .filter((f) => (f as { papel: string }).papel === 'usuario')
      .map((f) => (f as { texto: string }).texto);
    expect(textos).toContain('t0');

    // Mas o JSON das ferramentas antigas sumiu.
    const ferramentasVelhas = recebido.filter(
      (f, i) => (f as { papel: string }).papel === 'ferramenta' && i < recebido.length - 8,
    );
    expect(ferramentasVelhas).toHaveLength(0);

    // E o primeiro nunca é retorno de ferramenta órfão — a API recusaria tudo.
    expect((recebido[0] as { papel: string }).papel).not.toBe('ferramenta');
  });
});

describe('com atendente humano', () => {
  it('⭐ fica em silêncio de verdade, sem repetir a mesma frase', async () => {
    /*
     * Bug medido em produção: o motor devolve vazio de propósito quando a
     * conversa está com um humano, e o orquestrador lia isso como "não tenho o
     * que dizer", mandando a desculpa padrão. A cada mensagem. O cliente via a
     * mesma frase voltar e voltar — pior que não responder, porque mostra que
     * chegou e que não adiantou.
     */
    const p = porta({ texto: 'não deveria ser chamado' });

    const r = await atender(msg('alguém aí?'), {
      estadoGravado: {
        passo: 'com_atendente',
        lojaEmFoco: ZE,
        carrinho: [],
        atualizadoEm: new Date('2026-09-17T19:00:00Z').toISOString(),
      },
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    expect(r.respostas).toEqual([]);
    expect(p.chamou).toBe(0);
  });

  it('⭐ confirmar o pedido MANDA a despedida — não some no silêncio do atendente', async () => {
    /*
     * O orquestrador engolia qualquer resposta cujo estado NOVO fosse
     * com_atendente. Tocar em Confirmar gravava o passo e não mandava nada.
     * O cliente via o WhatsApp mudo e o agente, no "ok obrigado", prometia
     * de novo que ia chamar a loja.
     */
    const r = await atender(msg('sim'), {
      estadoGravado: {
        passo: 'confirmando',
        lojaEmFoco: ZE,
        carrinho: [
          {
            productId: 'coca',
            nome: 'Coca-Cola 2L',
            quantidade: 1,
            precoUnitarioCents: 1200,
            opcoes: [],
          },
        ],
        entrega: 'retirada',
        pagamento: 'pix',
        atualizadoEm: new Date('2026-09-17T19:00:00Z').toISOString(),
      },
      retrato: retrato(),
    });

    expect(JSON.stringify(r.respostas)).toContain('Pedido enviado pra loja');
    expect(r.estado.passo).toBe('com_atendente');
    expect(r.estado.carrinho).toHaveLength(0);
  });

  it('volta a atender depois do prazo de silêncio', async () => {
    // Remendo enquanto a caixa de entrada do painel não existe: sem prazo,
    // `com_atendente` é uma porta que só abre para dentro.
    const p = porta({ texto: 'Oi! Como posso ajudar?' });

    const r = await atender(msg('oi'), {
      estadoGravado: {
        passo: 'com_atendente',
        lojaEmFoco: ZE,
        carrinho: [],
        // cinco horas atrás — passou das quatro
        atualizadoEm: new Date('2026-09-17T14:00:00Z').toISOString(),
      },
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    expect(r.respostas.length).toBeGreaterThan(0);
    expect(p.chamou).toBe(1);
  });
});

describe('o que o motor segura sem gastar modelo', () => {
  it('⭐ áudio não chama o agente', async () => {
    const p = porta({ texto: 'não deveria ser chamado' });
    const audio = { ...msg(''), tipo: 'audio', texto: null };

    const r = await atender(audio, {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    expect(p.chamou).toBe(0);
    expect(JSON.stringify(r.respostas)).toContain('só leio texto');
  });

  it('pin de localização não chama o agente e marca entrega', async () => {
    const p = porta({ texto: 'não deveria ser chamado' });
    const pin = { ...msg('📍'), tipo: 'location' };

    const r = await atender(pin, {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    expect(p.chamou).toBe(0);
    expect(r.estado.entrega).toBe('entrega');
    expect(JSON.stringify(r.respostas)).toContain('Recebi sua localização');
  });

  it('⭐ "pode finalizar" com carrinho não chama o agente — segue o checkout', async () => {
    const p = porta({ texto: 'não deveria ser chamado' });

    const r = await atender(msg('pode finalizar'), {
      estadoGravado: {
        passo: 'no_cardapio',
        lojaEmFoco: ZE,
        entrega: 'entrega',
        endereco: 'Rua Ernani Rezende Vilela, 123, Santa Rita, Pouso Alegre',
        carrinho: [
          {
            productId: 'acai-1',
            nome: 'Açaí',
            quantidade: 1,
            precoUnitarioCents: 2000,
            opcoes: ['500ml', 'Ninho', 'Banana'],
          },
        ],
        atualizadoEm: new Date('2026-09-17T19:00:00Z').toISOString(),
      },
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    expect(p.chamou).toBe(0);
    expect(JSON.stringify(r.respostas)).toContain('Como vai pagar?');
    expect(JSON.stringify(r.respostas)).not.toContain('entrega ou retirada');
  });
});

describe('memória que sobrevive à poda', () => {
  it('⭐ injeta o carrinho e o endereço no diálogo, pra não perguntar de novo', async () => {
    /*
     * Conversa real: montou açaí 500ml com ninho, banana, morango e kiwi,
     * passou o endereço, e o bot perguntou "o que você quer pedir?". A poda
     * tinha comido o diálogo; o carrinho no estado estava vazio.
     */
    let recebido: { papel: string; texto?: string }[] = [];
    const p: PortaDeLLM = {
      modelo: 'falso',
      async responder(pedido) {
        recebido = pedido.dialogo as { papel: string; texto?: string }[];
        return { texto: 'Certo, açaí 500ml. Qual a forma de pagamento?', chamadas: [], uso: { entrada: 1, saida: 1, entradaEmCache: 0 } };
      },
    };

    await atender(msg('quanto demora a entrega?'), {
      estadoGravado: {
        passo: 'no_cardapio',
        lojaEmFoco: ZE,
        entrega: 'entrega',
        endereco: 'Rua Ernani Rezende Vilela, Residencial Santa Rita, Pouso Alegre',
        carrinho: [
          {
            productId: 'acai-1',
            nome: 'Açaí',
            quantidade: 1,
            precoUnitarioCents: 3200,
            opcoes: ['500ml', 'Creme de Ninho', 'Banana', 'Morango', 'Kiwi'],
          },
        ],
        atualizadoEm: new Date('2026-09-17T19:00:00Z').toISOString(),
      },
      retrato: retrato(),
      agente: { porta: p, sistema: 's', ferramentas: [] },
    });

    const memoria = recebido.find((f) => f.texto?.includes('já combinado'));
    expect(memoria?.texto).toContain('modalidade: entrega');
    expect(memoria?.texto).toContain('Açaí');
    expect(memoria?.texto).toContain('500ml');
    expect(memoria?.texto).toContain('Kiwi');
    expect(memoria?.texto).toContain('Ernani');
  });

  it('⭐ precificar_item grava o carrinho no estado', async () => {
    const precificar: Ferramenta = {
      nome: 'precificar_item',
      descricao: 'preço',
      schema: { type: 'object' },
      executar: async () =>
        deuCerto({
          produtoId: 'acai-1',
          nome: 'Açaí',
          quantidade: 1,
          opcoesEscolhidas: ['500ml', 'Ninho'],
          precoUnitarioCents: 2000,
          totalCents: 2000,
        }),
    };

    const porta: PortaDeLLM = {
      modelo: 'falso',
      async responder(pedido) {
        const jaChamou = pedido.dialogo.some((f) => f.papel === 'ferramenta');
        if (!jaChamou) {
          return {
            texto: null,
            chamadas: [{ id: 'c1', nome: 'precificar_item', argumentos: { produtoId: 'acai-1' } }],
            uso: { entrada: 1, saida: 1, entradaEmCache: 0 },
          };
        }
        return {
          texto: 'Açaí 500ml sai por R$ 20,00.',
          chamadas: [],
          uso: { entrada: 1, saida: 1, entradaEmCache: 0 },
        };
      },
    };

    const r = await atender(msg('quero de 500'), {
      estadoGravado: null,
      retrato: retrato(),
      agente: { porta, sistema: 's', ferramentas: [precificar] },
    });

    expect(r.estado.carrinho).toHaveLength(1);
    expect(r.estado.carrinho[0]).toMatchObject({
      nome: 'Açaí',
      opcoes: ['500ml', 'Ninho'],
      precoUnitarioCents: 2000,
    });
  });
});
