import { describe, expect, it } from 'vitest';
import { conversar } from '../helpers/transcricao';
import type { Retrato } from '@/infrastructure/integrations/whatsapp/conversa/motor';
import { lerIntencao, idDaOpcao } from '@/infrastructure/integrations/whatsapp/conversa/mensagem-de-saida';

/**
 * O esqueleto da conversa.
 *
 * O que se testa aqui é o comportamento visível — de quem é a conversa, o
 * menu, a montagem do item e o checkout. Texto e ordem de pergunta são onde
 * um bot de pedido irrita ou encanta, e isso só se descobre lendo o diálogo.
 */

const ZE = 'loja-ze';
const PEDRO = 'loja-pedro';

function retrato(over: Partial<Retrato> = {}): Retrato {
  return {
    agora: new Date('2026-09-17T19:00:00Z'),
    resolucao: { tipo: 'desconhecida' },
    nomeDaLoja: { [ZE]: 'Pizzaria do Zé', [PEDRO]: 'Hamburgueria do Pedro' },
    slugDaLoja: { [ZE]: 'pizzariadoze', [PEDRO]: 'hamburgueriapedro' },
    pedidosEmAndamento: [],
    ...over,
  };
}

describe('de quem é a conversa', () => {
  it('veio pelo cardápio: entra direto, sem perguntar nada', () => {
    const { transcricao, estado, delegou } = conversar(
      [{ cliente: 'Olá! Quero pedir na Pizzaria do Zé. #loja:pizzariadoze' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'codigo' } }),
    );

    expect(estado.lojaEmFoco).toBe(ZE);
    // A pergunta de loja NUNCA aparece para quem chegou pelo link — ele cai
    // direto no atendimento.
    expect(transcricao).not.toContain('Onde você quer pedir');
    expect(delegou).toBe(true);
  });

  it('pediu só numa loja: assume, sem atrito', () => {
    const { estado, transcricao, delegou } = conversar(
      [{ cliente: 'oi' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' } }),
    );

    expect(estado.lojaEmFoco).toBe(ZE);
    expect(transcricao).not.toContain('Onde você quer pedir');
    expect(delegou).toBe(true);
  });

  it('pediu em duas: pergunta neutro, sem eleger favorita', () => {
    const { transcricao, estado } = conversar(
      [{ cliente: 'oi' }],
      retrato({
        resolucao: {
          tipo: 'escolher',
          opcoes: [
            { establishmentId: ZE, resolvedAt: new Date('2026-09-15T00:00:00Z') },
            { establishmentId: PEDRO, resolvedAt: new Date('2026-09-01T00:00:00Z') },
          ],
        },
      }),
    );

    expect(transcricao).toContain('Onde você quer pedir hoje?');
    expect(transcricao).toContain('Pizzaria do Zé');
    expect(transcricao).toContain('Hamburgueria do Pedro');
    // Nenhuma loja foi assumida — ele escolhe.
    expect(estado.lojaEmFoco).toBeNull();
    expect(estado.passo).toBe('escolhendo_loja');
  });

  it('o toque na loja resolve, e é o id que manda — não o estado', () => {
    const { estado } = conversar(
      [
        { cliente: 'oi' },
        { cliente: idDaOpcao({ acao: 'loja', loja: 'hamburgueriapedro', alvo: 'hamburgueriapedro' }), toque: true },
      ],
      retrato({
        resolucao: {
          tipo: 'escolher',
          opcoes: [
            { establishmentId: ZE, resolvedAt: new Date('2026-09-15T00:00:00Z') },
            { establishmentId: PEDRO, resolvedAt: new Date('2026-09-01T00:00:00Z') },
          ],
        },
      }),
    );

    // Tocou no Pedro, vai para o Pedro — mesmo com o Zé sendo o mais recente.
    expect(estado.lojaEmFoco).toBe(PEDRO);
  });

  it('sem link e sem histórico: pede o nome, e não oferece loja nenhuma', () => {
    const { transcricao, delegou } = conversar([{ cliente: 'oi' }], retrato());

    expect(transcricao).toContain('me diz o nome da loja');
    // Sem loja definida o agente NÃO entra: ele não teria cardápio de quem
    // responder, e responderia genérico gastando token à toa.
    expect(delegou).toBe(false);
    /*
     * A regra do produto, cravada em teste: o bot NUNCA apresenta uma loja que
     * o cliente não escolheu antes. Sem isso, o lojista estaria divulgando um
     * número que mostra o concorrente para o cliente que ele trouxe.
     */
    expect(transcricao).not.toContain('Pizzaria do Zé');
    expect(transcricao).not.toContain('Hamburgueria do Pedro');
    expect(transcricao).not.toContain('perto de');
  });
});

const CARDAPIO = {
  categorias: [
    {
      nome: 'Açaí',
      produtos: [{ id: 'acai-1', nome: 'Açaí', aPartirDeCents: 1300 }],
    },
    {
      nome: 'Pizzas',
      produtos: [{ id: 'pizza-1', nome: 'Pizza Calabresa', aPartirDeCents: 4500 }],
    },
    {
      nome: 'Bebidas',
      produtos: [{ id: 'coca', nome: 'Coca-Cola 2L', aPartirDeCents: 1200 }],
    },
  ],
};

/** O açaí de verdade: tamanho com preço, base, frutas opcionais. */
const CARDAPIO_ACAI = {
  categorias: [
    {
      nome: 'Açaí',
      produtos: [
        {
          id: 'acai-1',
          nome: 'Açaí',
          priceCents: 1300,
          aPartirDeCents: 1300,
          grupos: [
            {
              id: 'tam',
              nome: 'Tamanho',
              min: 1,
              max: 1,
              opcoes: [
                { id: '200', nome: '200ml', priceCents: 0 },
                { id: '300', nome: '300ml', priceCents: 200 },
                { id: '400', nome: '400ml', priceCents: 400 },
                { id: '500', nome: '500ml', priceCents: 700 },
              ],
            },
            {
              id: 'base',
              nome: 'Base',
              min: 1,
              max: 1,
              opcoes: [
                { id: 'acai', nome: 'Açaí', priceCents: 0 },
                { id: 'ninho', nome: 'Ninho', priceCents: 0 },
                { id: 'misto', nome: 'Misto', priceCents: 0 },
              ],
            },
            {
              id: 'frutas',
              nome: 'Frutas',
              min: 0,
              max: 3,
              opcoes: [
                { id: 'banana', nome: 'Banana', priceCents: 0 },
                { id: 'morango', nome: 'Morango', priceCents: 0 },
                { id: 'kiwi', nome: 'Kiwi', priceCents: 0 },
                { id: 'manga', nome: 'Manga', priceCents: 0 },
              ],
            },
            {
              id: 'cremes',
              nome: 'Cremes',
              min: 0,
              max: 4,
              opcoes: [{ id: 'nutella', nome: 'Nutella', priceCents: 300 }],
            },
            {
              id: 'cereais',
              nome: 'Cereais',
              min: 0,
              max: 8,
              opcoes: [{ id: 'granola', nome: 'Granola', priceCents: 0 }],
            },
          ],
        },
      ],
    },
    {
      nome: 'Bebidas',
      produtos: [{ id: 'coca', nome: 'Coca-Cola 2L', aPartirDeCents: 1200, priceCents: 1200, grupos: [] }],
    },
  ],
};

describe('menu clicável do cardápio', () => {
  it('⭐ "oi" abre categorias pra tocar, não um parágrafo', () => {
    /*
     * Medido em produção: o cliente pediu "manda as categorias pra eu clicar"
     * e reclamou da formatação. Sem o menu no motor, o agente só gera texto.
     */
    const { transcricao, delegou, estado } = conversar(
      [{ cliente: 'Oi' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' }, ...CARDAPIO }),
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('O que você quer pedir hoje?');
    expect(transcricao).toContain('Açaí');
    expect(transcricao).toContain('Pizzas');
    expect(transcricao).toContain('Bebidas');
    expect(estado.passo).toBe('no_cardapio');
  });

  it('"ver o cardápio" e "o que vocês vendem" voltam o mesmo menu', () => {
    const frases = ['Ver o cardápio', 'O que vocês vendem ?', 'Quais que tem então'];

    for (const frase of frases) {
      const { transcricao, delegou } = conversar(
        [{ cliente: frase }],
        retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' }, ...CARDAPIO }),
      );

      expect(delegou).toBe(false);
      expect(transcricao).toContain('Categorias');
      expect(transcricao).toContain('Açaí');
    }
  });

  it('o toque na categoria lista os produtos COM preço', () => {
    const { transcricao, delegou } = conversar(
      [
        { cliente: 'oi' },
        { cliente: idDaOpcao({ acao: 'cat', loja: 'pizzariadoze', alvo: 'Açaí' }), toque: true },
      ],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' }, ...CARDAPIO }),
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('*Açaí*');
    expect(transcricao).toContain('a partir de R$ 13,00');
  });

  it('"quero um açaí" na primeira fala começa a montar, com preço', () => {
    const { delegou, transcricao } = conversar(
      [{ cliente: 'Quero um açaí' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' }, ...CARDAPIO_ACAI }),
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('Qual tamanho');
    expect(transcricao).toContain('R$ 13,00');
    expect(transcricao).toContain('R$ 20,00');
  });
});

describe('o que o WhatsApp manda sem texto', () => {
  it('⭐ áudio não vai pro agente — pede pra escrever', () => {
    /*
     * Conversa real: o cliente mandou áudio e o webhook chegou com texto nulo.
     * O agente recebeu uma fala vazia e improvisou. Responder aqui, sem modelo,
     * é o que o prompt já pedia e o motor não fazia.
     */
    const { transcricao, delegou } = conversar(
      [{ cliente: '', tipo: 'audio' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' }, ...CARDAPIO }),
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('só leio texto');
  });

  it('⭐ pin de localização assume entrega e pede o endereço escrito', () => {
    /*
     * Conversa real: mandou o pin, o bot disse que não via, depois perguntou
     * "entrega ou retirada?" — sendo que quem manda pin está pedindo entrega.
     * O pin sozinho não serve pro motoboy: falta número e complemento.
     */
    const { transcricao, delegou, estado } = conversar(
      [{ cliente: '📍 Localização (-22.23, -45.93)', tipo: 'location' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' }, ...CARDAPIO }),
    );

    expect(delegou).toBe(false);
    expect(estado.entrega).toBe('entrega');
    expect(transcricao).toContain('Recebi sua localização');
    expect(transcricao).toContain('rua, número e bairro');
    expect(transcricao).not.toContain('entrega ou retirada');
  });

  it('foto também pede texto, sem gastar modelo', () => {
    const { transcricao, delegou } = conversar(
      [{ cliente: '', tipo: 'image' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' } }),
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('só leio texto');
  });
});

describe('não perguntar o que o cliente já disse', () => {
  it('⭐ "entrega" fica no estado — sobrevive à poda do diálogo', () => {
    /*
     * Conversa real: "Seria entrega", depois rua, número, bairro, CEP, pin,
     * e o bot perguntou "Entrega ou retirada?". O modelo esquece; o estado não.
     */
    const { estado } = conversar(
      [{ cliente: 'Seria entrega' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' } }),
    );

    expect(estado.entrega).toBe('entrega');
  });

  it('CEP também marca entrega, sem perguntar a modalidade', () => {
    const { estado } = conversar(
      [{ cliente: '37558722' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' } }),
    );

    expect(estado.entrega).toBe('entrega');
  });

  it('"retirada" vence um "entrega" anterior quando o cliente muda de ideia', () => {
    const { estado } = conversar(
      [{ cliente: 'entrega' }, { cliente: 'melhor retirada' }],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' } }),
    );

    expect(estado.entrega).toBe('retirada');
  });
});

describe('quem já tem pedido a caminho', () => {
  it('abre falando do pedido, não do cardápio', () => {
    const { transcricao } = conversar(
      [{ cliente: 'oi' }],
      retrato({
        resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' },
        pedidosEmAndamento: [
          { id: 'p1', displayId: '12', lojaId: ZE, situacao: 'saiu para entrega' },
        ],
      }),
    );

    expect(transcricao).toContain('Pedido #12');
    expect(transcricao).toContain('saiu para entrega');
  });

  it('com pedidos em duas lojas, mostra os dois carimbados', () => {
    /*
     * A preocupação que originou este desenho: nenhuma loja pode ficar
     * escondida atrás da outra na conversa compartilhada.
     */
    const { transcricao } = conversar(
      [{ cliente: 'oi' }],
      retrato({
        resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' },
        pedidosEmAndamento: [
          { id: 'p1', displayId: '12', lojaId: ZE, situacao: 'saiu para entrega' },
          { id: 'p2', displayId: '7', lojaId: PEDRO, situacao: 'em preparo' },
        ],
      }),
    );

    expect(transcricao).toContain('*Pizzaria do Zé* · Pedido #12');
    expect(transcricao).toContain('*Hamburgueria do Pedro* · Pedido #7');
  });
});

describe('entrega para humano', () => {
  it('depois de pedir atendente, o bot fica calado', () => {
    const { transcricao, estado } = conversar(
      [
        { cliente: idDaOpcao({ acao: 'humano', loja: 'pizzariadoze', alvo: '' }), toque: true },
        { cliente: 'alguém aí?' },
      ],
      retrato({ resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' } }),
    );

    expect(estado.passo).toBe('com_atendente');
    /*
     * Duas vozes na mesma conversa é pior que bot nenhum: o cliente não sabe
     * com quem fala e repete a pergunta. Quem devolve para o bot é o atendente,
     * pelo painel.
     */
    expect(transcricao).toContain('(silêncio)');
  });
});

describe('o id que carrega o contexto', () => {
  it('ida e volta preserva ação, loja e alvo', () => {
    const id = idDaOpcao({ acao: 'conf', loja: 'pizzariadoze', alvo: '12' });

    expect(id).toBe('conf:pizzariadoze:12');
    expect(lerIntencao(id)).toEqual({ acao: 'conf', loja: 'pizzariadoze', alvo: '12' });
  });

  it('texto digitado não vira intenção', () => {
    expect(lerIntencao(null)).toBeNull();
    expect(lerIntencao('oi')).toBeNull();
  });
});

describe('fluxo do pedido — açaí até o resumo', () => {
  const mundo = retrato({
    resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' },
    ...CARDAPIO_ACAI,
  });

  it('⭐ do "oi" até confirmar, sem agente, com preço em cada escolha', () => {
    /*
     * A conversa real: o bot despejava tamanho+base+frutas num bloco, sem
     * preço, pedia entrega de novo depois do endereço, e esquecia o açaí.
     * Este diálogo é o contrato — se quebrar, o cliente volta a ligar.
     */
    const { transcricao, delegou, estado } = conversar(
      [
        { cliente: 'Oi' },
        { cliente: idDaOpcao({ acao: 'cat', loja: 'pizzariadoze', alvo: 'Açaí' }), toque: true },
        { cliente: idDaOpcao({ acao: 'item', loja: 'pizzariadoze', alvo: 'acai-1' }), toque: true },
        { cliente: '500' },
        { cliente: 'ninho' },
        { cliente: 'banana, morango e kiwi' },
        { cliente: 'sem isso' },
        { cliente: 'não' },
        { cliente: 'Pode finalizar meu pedido' },
        { cliente: 'entrega' },
        { cliente: '37558722' },
        { cliente: '123' },
        { cliente: 'Rua Ernani Rezende Vilela, Santa Rita' },
        { cliente: 'pix' },
        { cliente: 'sim' },
        { cliente: 'Ok, obrigado!' },
        { cliente: 'Só isso mesmo' },
      ],
      mundo,
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('O que você quer pedir hoje?');
    expect(transcricao).toContain('a partir de R$ 13,00');
    expect(transcricao).toContain('Qual tamanho');
    expect(transcricao).toContain('R$ 13,00');
    expect(transcricao).toContain('R$ 20,00');
    expect(transcricao).toContain('Qual base');
    expect(transcricao).toContain('Quais frutas');
    expect(transcricao).toContain('Banana');
    expect(transcricao).toContain('Morango');
    expect(transcricao).toContain('Kiwi');
    expect(transcricao).toContain('Subtotal: R$ 20,00');
    expect(transcricao).toContain('É para entrega ou retirada?');
    expect(transcricao).toContain('CEP 37558-722. Qual o número da casa?');
    expect(transcricao).toContain('Qual a rua e o bairro?');
    expect(transcricao).toContain('Como vai pagar?');
    expect(transcricao).toContain('*Pedido*');
    expect(transcricao).toContain('*Entrega*');
    expect(transcricao).toContain('*Pagamento*');
    expect(transcricao).toContain('Pix');
    expect(transcricao).toContain('*Total: R$ 20,00*');
    expect(transcricao).toContain('500ml · Ninho');
    expect(transcricao).toContain('Banana · Morango · Kiwi');
    expect(transcricao).toContain('Ernani');
    expect(transcricao).toContain('nº 123');
    expect(transcricao).toContain('Bairro Santa Rita');
    expect(transcricao).toContain('CEP 37558-722');
    expect(transcricao).toMatch(
      /\*Pedido\*[\s\S]*1× Açaí — R\$ 20,00[\s\S]*_500ml · Ninho · Banana · Morango · Kiwi_[\s\S]*\*Entrega\*[\s\S]*Rua Ernani Rezende Vilela, nº 123[\s\S]*Bairro Santa Rita[\s\S]*CEP 37558-722[\s\S]*\*Pagamento\*[\s\S]*Pix[\s\S]*\*Total: R\$ 20,00\*/,
    );
    expect(transcricao).toContain('Pedido enviado pra loja');
    expect(transcricao).toContain('(silêncio)');
    expect((transcricao.match(/Pedido enviado pra loja/g) ?? []).length).toBe(1);
    expect(transcricao).not.toContain('(delegado ao agente)');
    expect(estado.passo).toBe('com_atendente');
    expect(estado.carrinho).toHaveLength(0);
  });

  it('retirada + dinheiro + dois itens: resumo em bloco, sem endereço', () => {
    const { transcricao, delegou, estado } = conversar(
      [
        { cliente: 'quero uma coca' },
        { cliente: 'quero uma coca' },
        { cliente: 'Pode finalizar meu pedido' },
        { cliente: 'retirada' },
        { cliente: 'dinheiro' },
        { cliente: 'sim' },
      ],
      mundo,
    );

    expect(delegou).toBe(false);
    expect(transcricao).toMatch(
      /\*Pedido\*[\s\S]*1× Coca-Cola 2L — R\$ 12,00[\s\S]*1× Coca-Cola 2L — R\$ 12,00[\s\S]*\*Entrega\*[\s\S]*Retirada na loja[\s\S]*\*Pagamento\*[\s\S]*Dinheiro[\s\S]*\*Total: R\$ 24,00\*/,
    );
    expect(transcricao).not.toContain('Qual o número');
    expect(transcricao).toContain('Pedido enviado pra loja');
    expect(estado.carrinho).toHaveLength(0);
  });

  it('endereço completo numa fala vai direto pro pagamento', () => {
    const { transcricao, delegou, estado } = conversar(
      [
        { cliente: 'quero uma coca' },
        { cliente: 'Pode finalizar meu pedido' },
        { cliente: 'entrega' },
        { cliente: 'Rua das Flores, 50, Centro' },
        { cliente: 'pix' },
        { cliente: 'sim' },
      ],
      mundo,
    );

    expect(delegou).toBe(false);
    expect(transcricao).not.toContain('Qual o número');
    expect(transcricao).not.toContain('Qual o bairro');
    expect(transcricao).toContain('Rua das Flores, nº 50');
    expect(transcricao).toContain('Bairro Centro');
    expect(transcricao).toContain('Pedido enviado pra loja');
    expect(estado.passo).toBe('com_atendente');
  });

  it('depois de confirmar, "oi" reabre o cardápio em vez de ficar mudo pra sempre', () => {
    const { transcricao, delegou, estado } = conversar(
      [
        { cliente: 'quero uma coca' },
        { cliente: 'Pode finalizar meu pedido' },
        { cliente: 'retirada' },
        { cliente: 'pix' },
        { cliente: 'sim' },
        { cliente: 'Oi' },
      ],
      mundo,
    );

    expect(delegou).toBe(false);
    expect((transcricao.match(/Pedido enviado pra loja/g) ?? []).length).toBe(1);
    expect(transcricao).toContain('O que você quer pedir hoje?');
    expect(estado.passo).toBe('no_cardapio');
    expect(estado.carrinho).toHaveLength(0);
  });

  it('"quero um açaí de 500 de ninho" já pula o que foi dito', () => {
    const { transcricao, delegou, estado } = conversar(
      [{ cliente: 'Quero um açaí de 500 de ninho' }],
      mundo,
    );

    expect(delegou).toBe(false);
    expect(transcricao).not.toContain('Qual tamanho');
    expect(transcricao).toContain('Já: 500ml, Ninho');
    expect(transcricao).toContain('Quais frutas');
    expect(estado.itemEmMontagem?.selecao).toMatchObject({
      tam: ['500'],
      base: ['ninho'],
    });
  });

  it('coca sem grupo vai pro carrinho com preço, sem perguntar complemento', () => {
    const { transcricao, delegou, estado } = conversar([{ cliente: 'quero uma coca' }], mundo);

    expect(delegou).toBe(false);
    expect(transcricao).toContain('Coca-Cola 2L');
    expect(transcricao).toContain('R$ 12,00');
    expect(transcricao).toContain('Fechar pedido');
    expect(estado.carrinho).toHaveLength(1);
    expect(estado.carrinho[0].precoUnitarioCents).toBe(1200);
  });

  it('⭐ não pergunta entrega de novo quando o cliente já disse e já tem endereço', () => {
    const { transcricao, delegou } = conversar(
      [
        { cliente: 'quero uma coca' },
        { cliente: 'Pode finalizar meu pedido' },
      ],
      retrato({
        resolucao: { tipo: 'loja', establishmentId: ZE, via: 'memoria' },
        ...CARDAPIO_ACAI,
      }),
      {
        passo: 'ocioso',
        lojaEmFoco: ZE,
        carrinho: [],
        entrega: 'entrega',
        endereco: 'Rua Ernani Rezende Vilela, 123, Santa Rita, Pouso Alegre',
        pagamento: 'pix',
        atualizadoEm: new Date('2026-09-17T19:00:00Z').toISOString(),
      },
    );

    expect(delegou).toBe(false);
    expect(transcricao).not.toContain('É para entrega ou retirada?');
    expect(transcricao).toContain('*Pedido*');
    expect(transcricao).toContain('Ernani');
    expect(transcricao).toContain('*Pagamento*');
  });

  it('pronto nas frutas NÃO apaga banana e morango', () => {
    const { estado, transcricao } = conversar(
      [
        { cliente: 'Quero um açaí de 500 de ninho' },
        { cliente: 'banana e morango' },
        { cliente: 'pronto' },
      ],
      mundo,
    );

    expect(transcricao).toContain('Banana, Morango');
    expect(estado.itemEmMontagem?.selecao.frutas).toEqual(['banana', 'morango']);
  });

  it('⭐ conversa real: rua sem bairro não pula pro Pix — e correção no pagamento não cai no agente', () => {
    /*
     * 18/09 em produção: montou o açaí nos toques, passou CEP e número, mandou
     * só a avenida. O motor foi pro Pix. "Bairro Parque Real" caiu no agente,
     * que perguntou de novo e nunca mostrou o resumo clicável.
     */
    const { transcricao, delegou, estado } = conversar(
      [
        { cliente: 'Oi' },
        { cliente: idDaOpcao({ acao: 'cat', loja: 'pizzariadoze', alvo: 'Açaí' }), toque: true },
        { cliente: idDaOpcao({ acao: 'item', loja: 'pizzariadoze', alvo: 'acai-1' }), toque: true },
        { cliente: idDaOpcao({ acao: 'opt', loja: 'pizzariadoze', alvo: 'tam:500' }), toque: true },
        { cliente: idDaOpcao({ acao: 'opt', loja: 'pizzariadoze', alvo: 'base:ninho' }), toque: true },
        { cliente: idDaOpcao({ acao: 'opt', loja: 'pizzariadoze', alvo: 'frutas:kiwi' }), toque: true },
        { cliente: idDaOpcao({ acao: 'opt', loja: 'pizzariadoze', alvo: 'frutas:morango' }), toque: true },
        { cliente: idDaOpcao({ acao: 'okgrp', loja: 'pizzariadoze', alvo: 'frutas' }), toque: true },
        { cliente: idDaOpcao({ acao: 'opt', loja: 'pizzariadoze', alvo: 'cremes:nutella' }), toque: true },
        { cliente: idDaOpcao({ acao: 'okgrp', loja: 'pizzariadoze', alvo: 'cremes' }), toque: true },
        { cliente: idDaOpcao({ acao: 'opt', loja: 'pizzariadoze', alvo: 'cereais:granola' }), toque: true },
        { cliente: idDaOpcao({ acao: 'okgrp', loja: 'pizzariadoze', alvo: 'cereais' }), toque: true },
        { cliente: idDaOpcao({ acao: 'fecha', loja: 'pizzariadoze', alvo: '' }), toque: true },
        { cliente: idDaOpcao({ acao: 'mod', loja: 'pizzariadoze', alvo: 'entrega' }), toque: true },
        { cliente: '37552475' },
        { cliente: '300' },
        { cliente: 'Avenida Waldemar de Azevedo Junqueira' },
        { cliente: 'Bairro Parque Real' },
        { cliente: 'Não a rua é Waldemar De Azevedo Junqueira, bairro Santa Edwirges' },
        { cliente: 'pix' },
        { cliente: 'sim' },
      ],
      mundo,
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('Qual o bairro?');
    expect(transcricao).not.toMatch(/Como vai pagar\?[\s\S]*Qual o bairro\?/);
    expect(transcricao).toContain('Santa Edwirges');
    expect(transcricao).toContain('Como vai pagar?');
    expect(transcricao).toContain('*Pedido*');
    expect(transcricao).toContain('*Total:');
    expect(estado.passo).toBe('com_atendente');
    expect(estado.endereco).toMatch(/Santa Edwirges/i);
    expect(estado.endereco).toMatch(/300/);
  });

  it('⭐ rua sozinha guarda e pede número, depois bairro — até fechar', () => {
    const { transcricao, delegou, estado } = conversar(
      [
        { cliente: 'quero uma coca' },
        { cliente: idDaOpcao({ acao: 'fecha', loja: 'pizzariadoze', alvo: '' }), toque: true },
        { cliente: idDaOpcao({ acao: 'mod', loja: 'pizzariadoze', alvo: 'entrega' }), toque: true },
        { cliente: 'Avenida Waldemar de Azevedo Junqueira' },
        { cliente: '300' },
        { cliente: 'Santa Edwirges' },
        { cliente: 'pix' },
        { cliente: 'sim' },
      ],
      mundo,
    );

    expect(delegou).toBe(false);
    expect(transcricao).toContain('Qual o número da casa?');
    expect(transcricao).toContain('Qual o bairro?');
    expect(transcricao).toContain('Como vai pagar?');
    expect(transcricao).toContain('Waldemar');
    expect(transcricao).toContain('Santa Edwirges');
    expect(transcricao).toContain('nº 300');
    expect(estado.passo).toBe('com_atendente');
    expect(estado.endereco).toMatch(/Waldemar/i);
    expect(estado.endereco).toMatch(/Santa Edwirges/i);
    expect(estado.endereco).toMatch(/300/);
  });
});
