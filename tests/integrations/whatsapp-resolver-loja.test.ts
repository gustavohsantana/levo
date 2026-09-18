import { describe, expect, it, vi } from 'vitest';
import {
  codigoNoTexto,
  linkDeEntrada,
  resolverLoja,
  VALIDADE_DA_MEMORIA_MS,
  type Canal,
  type FontesDaLoja,
} from '@/infrastructure/integrations/whatsapp/resolver-loja';
import type { MensagemRecebida } from '@/infrastructure/integrations/whatsapp/webhook-protocol';

/**
 * De qual loja é a conversa.
 *
 * O erro caro aqui não é falhar — é ACERTAR A LOJA ERRADA. Uma conversa
 * atribuída à loja errada vira pedido na cozinha errada, e ninguém descobre
 * olhando a tela: o pedido parece perfeitamente normal.
 */

const NUMERO_DO_LEVO = '106540352242922';
const NUMERO_DA_LOJA = '999888777666555';

function msg(extra: Partial<MensagemRecebida> = {}): MensagemRecebida {
  return {
    id: 'wamid.ABC',
    de: '553599887766',
    nome: 'Maria',
    tipo: 'text',
    texto: 'Olá! Quero fazer um pedido.',
    opcaoId: null,
    em: new Date('2026-09-17T12:00:00Z'),
    paraNumeroId: NUMERO_DO_LEVO,
    ...extra,
  };
}

function fontes(over: Partial<FontesDaLoja> & { canal?: Canal | null } = {}) {
  const lembrou: { canal: string; telefone: string; loja: string }[] = [];

  const base: FontesDaLoja = {
    canalPorNumero: async (id) =>
      over.canal !== undefined
        ? over.canal
        : { id: 'canal-levo', establishmentId: null, active: true, ...(id ? {} : {}) },
    lojaPorCodigo: async () => null,
    historico: async () => [],
    lembrar: async (canal, telefone, loja) => {
      lembrou.push({ canal, telefone, loja });
    },
  };

  return { fontes: { ...base, ...over } as FontesDaLoja, lembrou };
}

describe('número da própria loja', () => {
  it('resolve pelo canal, sem consultar código nem memória', async () => {
    const porCodigo = vi.fn(async () => 'outra-loja');
    const { fontes: f } = fontes({
      canal: { id: 'canal-loja', establishmentId: 'pizzaria', active: true },
      lojaPorCodigo: porCodigo,
    });

    const r = await resolverLoja(msg({ paraNumeroId: NUMERO_DA_LOJA }), f);

    expect(r).toEqual({ tipo: 'loja', establishmentId: 'pizzaria', via: 'canal' });
    // O número já responde a pergunta: procurar código seria trabalho jogado
    // fora, e pior, poderia discordar do próprio número.
    expect(porCodigo).not.toHaveBeenCalled();
  });
});

describe('número compartilhado do Levô', () => {
  it('usa o código que veio no link e memoriza para a próxima', async () => {
    const { fontes: f, lembrou } = fontes({
      lojaPorCodigo: async (c) => (c === 'pizzajoao' ? 'loja-do-joao' : null),
    });

    const r = await resolverLoja(msg({ texto: 'Olá! Quero pedir. #loja:pizzajoao' }), f);

    expect(r).toEqual({ tipo: 'loja', establishmentId: 'loja-do-joao', via: 'codigo' });
    expect(lembrou).toEqual([
      { canal: 'canal-levo', telefone: '553599887766', loja: 'loja-do-joao' },
    ]);
  });

  it('uma loja só no histórico: responde direto, sem atrito', async () => {
    const { fontes: f } = fontes({
      historico: async () => [
        { establishmentId: 'loja-do-joao', resolvedAt: new Date('2026-09-16T12:00:00Z') },
      ],
    });

    const r = await resolverLoja(msg({ texto: 'oi' }), f);

    expect(r).toEqual({ tipo: 'loja', establishmentId: 'loja-do-joao', via: 'memoria' });
  });

  it('duas lojas no histórico: pergunta neutro, sem eleger favorita', async () => {
    /*
     * Sugerir a mais recente seria o Levô escolher favorito entre duas lojas
     * que pagam por ele. A ordem da lista é conveniência de memória; quem
     * escolhe é o cliente.
     */
    const { fontes: f } = fontes({
      historico: async () => [
        { establishmentId: 'loja-do-joao', resolvedAt: new Date('2026-09-16T12:00:00Z') },
        { establishmentId: 'loja-do-pedro', resolvedAt: new Date('2026-09-01T12:00:00Z') },
      ],
    });

    const r = await resolverLoja(msg({ texto: 'oi' }), f);

    expect(r.tipo).toBe('escolher');
    // Mais recente primeiro: é como ele lembra ("da última vez eu pedi no...").
    expect(r.tipo === 'escolher' && r.opcoes.map((o) => o.establishmentId)).toEqual([
      'loja-do-joao',
      'loja-do-pedro',
    ]);
  });

  it('o código VENCE a memória — é o erro que mandaria pedido para a cozinha errada', async () => {
    /*
     * Quem tocou no link de outra loja está pedindo de outra loja. Se a memória
     * ganhasse aqui, o pedido iria para a anterior — e pareceria normal na tela.
     */
    const { fontes: f } = fontes({
      lojaPorCodigo: async (c) => (c === 'hamburgueria' ? 'loja-do-pedro' : null),
      historico: async () => [
        { establishmentId: 'loja-do-joao', resolvedAt: new Date('2026-09-17T11:00:00Z') },
      ],
    });

    const r = await resolverLoja(msg({ texto: 'Quero pedir #loja:hamburgueria' }), f);

    expect(r.tipo === 'loja' && r.establishmentId).toBe('loja-do-pedro');
  });

  it('memória vencida pergunta de novo em vez de chutar', async () => {
    const agora = new Date('2026-09-17T12:00:00Z');
    const { fontes: f } = fontes({
      historico: async () => [
        {
          establishmentId: 'loja-do-joao',
          resolvedAt: new Date(agora.getTime() - VALIDADE_DA_MEMORIA_MS - 1000),
        },
      ],
    });

    expect((await resolverLoja(msg({ texto: 'oi' }), f, agora)).tipo).toBe('desconhecida');
  });

  it('código desconhecido cai para a memória em vez de estourar', async () => {
    const { fontes: f } = fontes({
      lojaPorCodigo: async () => null,
      historico: async () => [
        { establishmentId: 'loja-do-joao', resolvedAt: new Date('2026-09-17T11:00:00Z') },
      ],
    });

    const r = await resolverLoja(msg({ texto: 'oi #loja:lojaquefechou' }), f);

    expect(r.tipo === 'loja' && r.via).toBe('memoria');
  });

  it('sem código e sem memória devolve null — quem chama pergunta', async () => {
    const { fontes: f } = fontes();

    expect((await resolverLoja(msg({ texto: 'bom dia' }), f)).tipo).toBe('desconhecida');
  });
});

describe('canal que não deveria atender', () => {
  it('número desconhecido não vira pedido', async () => {
    const { fontes: f } = fontes({ canal: null });

    expect((await resolverLoja(msg(), f)).tipo).toBe('desconhecida');
  });

  it('número desligado para de atender', async () => {
    /*
     * A inscrição da Meta entrega evento de TODOS os números do app — inclusive
     * o de teste e o de uma loja que acabou de sair. Sem esta guarda, o número
     * desligado continuaria tomando pedido.
     */
    const { fontes: f } = fontes({
      canal: { id: 'canal-loja', establishmentId: 'pizzaria', active: false },
    });

    expect((await resolverLoja(msg(), f)).tipo).toBe('desconhecida');
  });
});

describe('o código dentro do texto', () => {
  it('só aceita o marcador, não palavra solta', () => {
    expect(codigoNoTexto('quero pizzajoao hoje')).toBeNull();
    expect(codigoNoTexto('oi #loja:pizzajoao')).toBe('pizzajoao');
    expect(codigoNoTexto('OI #LOJA:PizzaJoao')).toBe('pizzajoao');
    expect(codigoNoTexto(null)).toBeNull();
  });

  it('o link publicado carrega o marcador que o resolvedor lê', () => {
    // As duas pontas têm que concordar; é por isso que moram no mesmo arquivo.
    const link = linkDeEntrada('+55 (35) 99999-8888', 'pizzajoao');

    expect(link).toContain('https://wa.me/5535999998888?text=');
    const texto = decodeURIComponent(link.split('text=')[1]);
    expect(codigoNoTexto(texto)).toBe('pizzajoao');
  });
});
