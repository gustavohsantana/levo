import { describe, expect, it, vi } from 'vitest';
import { Agente } from '@/infrastructure/agente/agente';
import { deuCerto, deuErrado, type Ferramenta } from '@/infrastructure/agente/ferramenta';
import { valoresSemProcedencia } from '@/infrastructure/agente/guardrails';
import type {
  FalaDoDialogo,
  PortaDeLLM,
  RespostaDoModelo,
} from '@/infrastructure/agente/porta-llm';

/**
 * O núcleo do agente, testado SEM rede.
 *
 * É este arquivo que justifica a porta existir: dá para provar teto de laço,
 * ferramenta que estoura, nome inventado e guardrail de preço sem gastar um
 * centavo e sem depender de o provedor estar no ar.
 */

/** Uma porta que devolve respostas roteirizadas, na ordem. */
function portaFalsa(roteiro: Partial<RespostaDoModelo>[]): PortaDeLLM & { chamadas: number } {
  let i = 0;
  const porta = {
    modelo: 'falso',
    chamadas: 0,
    async responder(): Promise<RespostaDoModelo> {
      porta.chamadas += 1;
      const passo = roteiro[Math.min(i, roteiro.length - 1)];
      i += 1;
      return {
        texto: passo.texto ?? null,
        chamadas: passo.chamadas ?? [],
        uso: passo.uso ?? { entrada: 100, saida: 20, entradaEmCache: 90 },
      };
    },
  };
  return porta;
}

function ferramenta(nome: string, executar: Ferramenta['executar']): Ferramenta {
  return { nome, descricao: `faz ${nome}`, schema: { type: 'object' }, executar };
}

const OI: FalaDoDialogo[] = [{ papel: 'usuario', texto: 'oi' }];

describe('o laço', () => {
  it('responde direto quando o modelo não pede ferramenta', async () => {
    const porta = portaFalsa([{ texto: 'Olá!' }]);
    const r = await new Agente({ porta, sistema: 's', ferramentas: [] }).responder(OI);

    expect(r.texto).toBe('Olá!');
    expect(r.fim).toBe('resposta');
    expect(r.iteracoes).toBe(1);
  });

  it('executa a ferramenta e devolve o resultado ao modelo', async () => {
    const executar = vi.fn(async () => deuCerto({ preco: 6290 }));
    const porta = portaFalsa([
      { chamadas: [{ id: 'c1', nome: 'preco', argumentos: { item: 'calabresa' } }] },
      { texto: 'A calabresa sai por R$ 62,90.' },
    ]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [ferramenta('preco', executar)],
    }).responder(OI);

    expect(executar).toHaveBeenCalledWith({ item: 'calabresa' });
    expect(r.texto).toContain('62,90');
    expect(r.iteracoes).toBe(2);

    const daFerramenta = r.dialogo.find((f) => f.papel === 'ferramenta');
    expect(daFerramenta).toMatchObject({ chamadaId: 'c1', nome: 'preco' });
  });

  it('soma o uso de todas as voltas', async () => {
    const porta = portaFalsa([
      { chamadas: [{ id: 'c1', nome: 'x', argumentos: {} }] },
      { texto: 'pronto' },
    ]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [ferramenta('x', async () => deuCerto({}))],
    }).responder(OI);

    expect(r.uso).toEqual({ entrada: 200, saida: 40, entradaEmCache: 180 });
  });

  it('para no teto em vez de girar para sempre', async () => {
    /*
     * Modelo que chama ferramenta, lê o resultado e chama de novo, sem fim.
     * Sem teto isso é uma conta de API aberta enquanto o cliente olha o nada.
     */
    const porta = portaFalsa([{ chamadas: [{ id: 'c', nome: 'x', argumentos: {} }] }]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [ferramenta('x', async () => deuCerto({}))],
      limites: { iteracoes: 3 },
    }).responder(OI);

    expect(r.fim).toBe('teto');
    expect(r.iteracoes).toBe(3);
    expect(porta.chamadas).toBe(3);
    // Texto vazio de propósito: quem chama decide o que dizer ao cliente.
    expect(r.texto).toBe('');
  });
});

describe('quando a ferramenta falha', () => {
  it('erro de negócio vira resultado legível, não exceção', async () => {
    const porta = portaFalsa([
      { chamadas: [{ id: 'c1', nome: 'cep', argumentos: { cep: '00000000' } }] },
      { texto: 'Esse CEP não encontrei. Pode conferir?' },
    ]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [ferramenta('cep', async () => deuErrado('CEP não encontrado'))],
    }).responder(OI);

    const retorno = r.dialogo.find((f) => f.papel === 'ferramenta');
    expect(retorno && 'conteudo' in retorno && retorno.conteudo).toContain('CEP não encontrado');
    expect(r.texto).toContain('conferir');
  });

  it('exceção não derruba a conversa', async () => {
    const porta = portaFalsa([
      { chamadas: [{ id: 'c1', nome: 'x', argumentos: {} }] },
      { texto: 'Tive um problema aqui.' },
    ]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [
        ferramenta('x', async () => {
          throw new Error('banco fora');
        }),
      ],
    }).responder(OI);

    expect(r.fim).toBe('resposta');
    const retorno = r.dialogo.find((f) => f.papel === 'ferramenta');
    expect(retorno && 'conteudo' in retorno && retorno.conteudo).toContain('falhou');
  });

  it('nome inventado devolve a lista do que existe', async () => {
    const porta = portaFalsa([
      { chamadas: [{ id: 'c1', nome: 'consultar_estoque', argumentos: {} }] },
      { texto: 'ok' },
    ]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [ferramenta('buscar_no_cardapio', async () => deuCerto({}))],
    }).responder(OI);

    const retorno = r.dialogo.find((f) => f.papel === 'ferramenta');
    expect(retorno && 'conteudo' in retorno && retorno.conteudo).toContain('buscar_no_cardapio');
  });

  it('devolve TODOS os resultados quando há chamadas em paralelo', async () => {
    /*
     * Omitir o resultado da que falhou faz o modelo ficar esperando uma
     * resposta que nunca chega — e o cliente leva silêncio.
     */
    const porta = portaFalsa([
      {
        chamadas: [
          { id: 'c1', nome: 'ok', argumentos: {} },
          { id: 'c2', nome: 'ruim', argumentos: {} },
        ],
      },
      { texto: 'pronto' },
    ]);

    const r = await new Agente({
      porta,
      sistema: 's',
      ferramentas: [
        ferramenta('ok', async () => deuCerto({ a: 1 })),
        ferramenta('ruim', async () => deuErrado('deu ruim')),
      ],
    }).responder(OI);

    const retornos = r.dialogo.filter((f) => f.papel === 'ferramenta');
    expect(retornos).toHaveLength(2);
    expect(retornos.map((f) => 'chamadaId' in f && f.chamadaId)).toEqual(['c1', 'c2']);
  });
});

describe('guardrail de preço', () => {
  it('aceita valor que veio de ferramenta', () => {
    const resultados = [deuCerto({ nome: 'Calabresa', precoCents: 6290 })];

    expect(valoresSemProcedencia('Sai por R$ 62,90.', resultados)).toEqual([]);
  });

  it('acusa valor que o modelo inventou', () => {
    /*
     * O erro mais caro de um bot de pedido: preço que não existe. Quem paga a
     * diferença é o lojista — e ele descobre no fim do mês, sem saber a origem.
     */
    const resultados = [deuCerto({ nome: 'Calabresa', precoCents: 6290 })];

    expect(valoresSemProcedencia('Sai por R$ 45,00.', resultados)).toEqual(['45,00']);
  });

  it('entende reais e centavos como a mesma coisa', () => {
    // As ferramentas devolvem centavos (é como o domínio guarda) e o modelo
    // escreve em reais. Sem essa equivalência, todo preço certo seria acusado.
    expect(valoresSemProcedencia('R$ 7,50', [deuCerto({ v: 750 })])).toEqual([]);
    expect(valoresSemProcedencia('R$ 7,50', [deuCerto({ v: '7.50' })])).toEqual([]);
  });

  it('não acusa texto sem valor nenhum', () => {
    expect(valoresSemProcedencia('Qual o seu endereço?', [])).toEqual([]);
  });
});

describe('guardrail: somas legítimas', () => {
  it('aceita o total, que é item mais taxa', async () => {
    /*
     * Medido contra a API real: o modelo respondeu "R$ 65,00 a pizza, taxa
     * R$ 15,00, total R$ 80,00". Os dois primeiros vieram de ferramenta; o
     * terceiro ele somou — e somou certo. Acusar isso encheria o log de alarme
     * falso até ninguém mais olhar.
     */
    const { deuCerto: ok } = await import('@/infrastructure/agente/ferramenta');
    const resultados = [ok({ totalCents: 6500 }), ok({ taxaCents: 1500 })];

    expect(
      valoresSemProcedencia('Pizza R$ 65,00, entrega R$ 15,00. Total R$ 80,00.', resultados),
    ).toEqual([]);
  });

  it('ainda acusa o que não é soma de nada visto', async () => {
    const { deuCerto: ok } = await import('@/infrastructure/agente/ferramenta');
    const resultados = [ok({ totalCents: 6500 }), ok({ taxaCents: 1500 })];

    expect(valoresSemProcedencia('Sai por R$ 39,90.', resultados)).toEqual(['39,90']);
  });
});
