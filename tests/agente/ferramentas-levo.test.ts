import { describe, expect, it } from 'vitest';
import { Money } from '@/core';
import {
  ferramentasDoLevo,
  type CardapioDaLoja,
  type DependenciasDoLevo,
} from '@/infrastructure/integrations/whatsapp/conversa/ferramentas';

/**
 * As ferramentas do Levô.
 *
 * O que se prova aqui é o que sustenta o guardrail: todo número que o agente
 * pode dizer sai de cálculo do domínio, não de soma do modelo. Com as
 * dependências injetadas, roda sem Next e sem banco.
 */

const PIZZA = {
  id: 'p1',
  name: 'Pizza Calabresa',
  description: 'Calabresa, cebola e orégano',
  priceCents: 4500,
  precoMinimoCents: 4500,
  grupos: [
    {
      id: 'g-tamanho',
      name: 'Tamanho',
      min: 1,
      max: 1,
      options: [
        { id: 'o-m', name: 'Média', priceCents: 0 },
        { id: 'o-g', name: 'Grande', priceCents: 1200 },
      ],
    },
    {
      id: 'g-borda',
      name: 'Borda recheada',
      min: 0,
      max: 1,
      options: [{ id: 'o-cat', name: 'Catupiry', priceCents: 800 }],
    },
  ],
};

const CARDAPIO: CardapioDaLoja = {
  nome: 'Pizzaria do Zé',
  preparo: '30 a 40 min',
  pickupEnabled: true,
  taxaFixaCents: 700,
  lat: -22.23,
  lng: -45.93,
  categorias: [
    { nome: 'Pizzas', produtos: [PIZZA] },
    {
      nome: 'Bebidas',
      produtos: [
        { id: 'p2', name: 'Coca-Cola 2L', description: null, priceCents: 1200, precoMinimoCents: 1200, grupos: [] },
      ],
    },
  ],
};

function deps(over: Partial<DependenciasDoLevo> = {}): DependenciasDoLevo {
  return {
    cardapio: async () => CARDAPIO,
    faixasDeTaxa: async () => [],
    localizar: async () => null,
    consultarCep: async () => null,
    ...over,
  };
}

function pegar(nome: string, d = deps()) {
  const f = ferramentasDoLevo('pizzariadoze', d).find((x) => x.nome === nome);
  if (!f) throw new Error(`ferramenta ${nome} não existe`);
  return f;
}

describe('buscar_no_cardapio', () => {
  it('filtra por termo e nunca despeja o cardápio inteiro', async () => {
    const r = await pegar('buscar_no_cardapio').executar({ termo: 'calabresa' });
    const dados = r.dados as { achados: { nome: string; temOpcoes: boolean; aPartirDe: string }[] };

    expect(r.ok).toBe(true);
    expect(dados.achados).toHaveLength(1);
    expect(dados.achados[0].nome).toBe('Pizza Calabresa');
    expect(dados.achados[0].aPartirDe).toBe('R$ 45,00');
    // Diz que HÁ opções sem despejar os grupos: o modelo pede o detalhe só do
    // produto que interessa, e paga tokens de um, não do cardápio todo.
    expect(dados.achados[0].temOpcoes).toBe(true);
  });

  it('todas as palavras precisam casar', async () => {
    // "pizza calabresa" não pode trazer toda pizza do cardápio.
    const achou = await pegar('buscar_no_cardapio').executar({ termo: 'pizza calabresa' });
    const nada = await pegar('buscar_no_cardapio').executar({ termo: 'pizza portuguesa' });

    expect((achou.dados as { achados: unknown[] }).achados).toHaveLength(1);
    expect((nada.dados as { achados: unknown[] }).achados).toHaveLength(0);
  });

  it('sem termo, devolve as categorias', async () => {
    const r = await pegar('buscar_no_cardapio').executar({});
    const dados = r.dados as { categorias: { nome: string; quantidade: number }[] };

    expect(dados.categorias).toEqual([
      { nome: 'Pizzas', quantidade: 1 },
      { nome: 'Bebidas', quantidade: 1 },
    ]);
  });
});

describe('detalhar_produto', () => {
  it('traduz min/max em obrigatoriedade', async () => {
    /*
     * O domínio não tem campo "obrigatório" — sai de min/max. Traduzir aqui
     * evita o modelo deduzir da estrutura e errar.
     */
    const r = await pegar('detalhar_produto').executar({ produtoId: 'p1' });
    const dados = r.dados as {
      grupos: { nome: string; obrigatorio: boolean; escolhaMaxima: number; opcoes: { nome: string; preco: string }[] }[];
    };

    expect(dados.grupos[0]).toMatchObject({ nome: 'Tamanho', obrigatorio: true, escolhaMaxima: 1 });
    expect(dados.grupos[1]).toMatchObject({ nome: 'Borda recheada', obrigatorio: false });
    // Preço na opção, já em reais — o modelo copia, não converte centavos.
    expect(dados.grupos[0].opcoes[1]).toMatchObject({ nome: 'Grande', preco: 'R$ 12,00' });
  });

  it('produto inexistente vira erro legível, não exceção', async () => {
    const r = await pegar('detalhar_produto').executar({ produtoId: 'nao-existe' });

    expect(r.ok).toBe(false);
    expect(r.erro).toContain('não encontrado');
  });
});

describe('precificar_item', () => {
  it('soma os complementos com o cálculo do domínio', async () => {
    const r = await pegar('precificar_item').executar({
      produtoId: 'p1',
      quantidade: 2,
      opcoes: { 'g-tamanho': ['o-g'], 'g-borda': ['o-cat'] },
    });
    const dados = r.dados as { precoUnitarioCents: number; totalCents: number; opcoesEscolhidas: string[]; total: string };

    // 4500 base + 1200 grande + 800 catupiry = 6500
    expect(dados.precoUnitarioCents).toBe(6500);
    expect(dados.totalCents).toBe(13000);
    expect(dados.total).toBe('R$ 130,00');
    expect(dados.opcoesEscolhidas).toEqual(['Grande', 'Catupiry']);
  });

  it('recusa escolha inválida com a mensagem do domínio', async () => {
    // Sem tamanho, que é obrigatório (min: 1).
    const r = await pegar('precificar_item').executar({ produtoId: 'p1', quantidade: 1, opcoes: {} });

    expect(r.ok).toBe(false);
    expect(r.erro).toBeTruthy();
  });

  it('produto sem opções também precifica', async () => {
    const r = await pegar('precificar_item').executar({ produtoId: 'p2', quantidade: 3 });

    expect((r.dados as { totalCents: number }).totalCents).toBe(3600);
  });
});

describe('calcular_taxa_de_entrega', () => {
  it('⭐ usa a FAIXA por distância, não a taxa fixa do cardápio', async () => {
    /*
     * O cardápio expõe a taxa fixa (700). Numa loja com faixas, o valor real é
     * outro — e o bot anuncia o total antes de confirmar. Anunciar um e cobrar
     * outro é a reclamação que chega ao lojista, não a nós.
     */
    const d = deps({
      localizar: async () => ({ lat: -22.25, lng: -45.95 }), // ~3 km
      faixasDeTaxa: async () => [
        { uptoMeters: 2000, fee: Money.fromCents(500) },
        { uptoMeters: 5000, fee: Money.fromCents(1500) },
      ],
    });

    const r = await pegar('calcular_taxa_de_entrega', d).executar({
      endereco: 'Rua das Flores, 100 - Centro, Pouso Alegre',
    });
    const dados = r.dados as { taxaCents: number; comoFoiCalculada: string; distanciaMetros: number };

    expect(dados.taxaCents).toBe(1500); // a faixa, não os 700 do cardápio
    expect(dados.comoFoiCalculada).toBe('faixa por distância');
    expect(dados.distanciaMetros).toBeGreaterThan(2000);
  });

  it('⭐ sem localizar o endereço, RECUSA em vez de devolver a taxa fixa', async () => {
    /*
     * Medido em conversa real: perguntaram por Campinas (200 km), o
     * geocodificador não achou, a ferramenta devolvia a taxa fixa e o bot
     * respondia "a entrega aparece possível, R$ 7,00". Viraria pedido para
     * outro estado.
     *
     * Taxa de fallback serve ao cardápio web, onde o cliente digitou o próprio
     * endereço e há um humano conferindo. Para um bot que fecha pedido sozinho,
     * qualquer número é lido como confirmação de que dá para entregar.
     */
    const r = await pegar('calcular_taxa_de_entrega').executar({
      endereco: 'Rua Barão de Jaguara, 500 - Campinas',
    });

    expect(r.ok).toBe(false);
    expect(r.erro).toContain('NÃO posso confirmar');
    // E diz o que fazer em vez de deixar o modelo improvisar.
    expect(r.erro).toContain('chame alguém da loja');
  });

  it('endereço curto demais é recusado antes de gastar geocodificação', async () => {
    const r = await pegar('calcular_taxa_de_entrega').executar({ endereco: 'centro' });

    expect(r.ok).toBe(false);
    expect(r.erro).toContain('rua, número e bairro');
  });
});

describe('consultar_cep', () => {
  it('avisa quando o CEP não traz rua nem bairro', async () => {
    /*
     * CEP de cidade inteira vem sem rua. Sem esse aviso, o modelo devolveria
     * "Rua: " vazio ao cliente como se fosse resposta.
     */
    const d = deps({
      consultarCep: async () => ({ cidade: 'Pouso Alegre', estado: 'MG', bairro: '', rua: '' }),
    });

    const r = await pegar('consultar_cep', d).executar({ cep: '37550-000' });
    const dados = r.dados as { precisaPerguntarRua: boolean; precisaPerguntarBairro: boolean };

    expect(dados.precisaPerguntarRua).toBe(true);
    expect(dados.precisaPerguntarBairro).toBe(true);
  });

  it('recusa CEP com tamanho errado sem chamar a rede', async () => {
    let chamou = false;
    const d = deps({
      consultarCep: async () => {
        chamou = true;
        return null;
      },
    });

    const r = await pegar('consultar_cep', d).executar({ cep: '123' });

    expect(r.ok).toBe(false);
    expect(chamou).toBe(false);
  });
});
