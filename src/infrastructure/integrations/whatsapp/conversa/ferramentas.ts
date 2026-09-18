import { Money } from '@/core';
import {
  nomesDaSelecao,
  precoDaSelecao,
  precoMinimo,
  validarSelecao,
  type OptionGroupSpec,
  type Selection,
} from '@/core/services/option-selection';
import { taxaPorDistancia, type DeliveryFeeBand } from '@/core/services/delivery-fee';
import { deuCerto, deuErrado, type Ferramenta } from '@/infrastructure/agente/ferramenta';

/**
 * As ferramentas do Levô — o que o agente pode olhar.
 *
 * Todas são **leitura ou cálculo puro**. Nenhuma grava nada, e isso é decisão,
 * não omissão: quem cria pedido é o motor determinístico, com o resumo aceito
 * pelo cliente por toque. Um modelo que pudesse gravar transformaria uma
 * interpretação errada em pedido errado na cozinha, sem ninguém no meio.
 *
 * As dependências entram por parâmetro em vez de `import` direto porque o
 * cardápio e o geocodificador vivem em Server Actions do Next. Injetando, o
 * teste roda sem Next e sem banco — e é onde os cálculos de preço precisam ser
 * provados.
 */

/** O que o cardápio devolve, reduzido ao que as ferramentas usam. */
export interface ProdutoDoCardapio {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  precoMinimoCents: number;
  grupos: { id: string; name: string; min: number; max: number; options: { id: string; name: string; priceCents: number }[] }[];
}

export interface CardapioDaLoja {
  nome: string;
  preparo: string | null;
  pickupEnabled: boolean;
  taxaFixaCents: number;
  lat: number | null;
  lng: number | null;
  categorias: { nome: string; produtos: ProdutoDoCardapio[] }[];
}

export interface DependenciasDoLevo {
  cardapio(slug: string): Promise<CardapioDaLoja | null>;
  /** Faixas de taxa por distância. Vazio quando a loja usa taxa fixa. */
  faixasDeTaxa(slug: string): Promise<DeliveryFeeBand[]>;
  /** Endereço em texto → coordenada. `null` quando não achou. */
  localizar(slug: string, endereco: string): Promise<{ lat: number; lng: number } | null>;
  consultarCep(cep: string): Promise<{ cidade: string; estado: string; bairro: string; rua: string } | null>;
}

export function ferramentasDoLevo(slug: string, deps: DependenciasDoLevo): Ferramenta[] {
  return [
    buscarNoCardapio(slug, deps),
    detalharProduto(slug, deps),
    precificarItem(slug, deps),
    calcularTaxaDeEntrega(slug, deps),
    consultarCep(deps),
  ];
}

/* ---------------------------------------------------------------- */

/**
 * Busca produtos por termo.
 *
 * Devolve o cardápio **filtrado**, nunca inteiro: uma loja com 80 produtos e os
 * grupos de opção de cada um passa de 10 mil tokens, e isso entraria em toda
 * chamada. Filtrar aqui é o que mantém o custo por pedido em centavos.
 */
function buscarNoCardapio(slug: string, deps: DependenciasDoLevo): Ferramenta {
  return {
    nome: 'buscar_no_cardapio',
    descricao:
      'Procura produtos no cardápio da loja por um termo (ex.: "calabresa", "refrigerante"). ' +
      'Devolve nome, descrição e preço a partir de. Use SEMPRE antes de falar de qualquer ' +
      'produto ou preço — nunca cite item ou valor que não tenha vindo daqui. ' +
      'Sem termo, devolve as categorias disponíveis.',
    schema: {
      type: 'object',
      properties: {
        termo: { type: 'string', description: 'O que o cliente procura. Omita para listar categorias.' },
      },
      additionalProperties: false,
    },
    async executar({ termo }) {
      const cardapio = await deps.cardapio(slug);
      if (!cardapio) return deuErrado('Cardápio não encontrado.');

      const busca = String(termo ?? '').trim().toLowerCase();

      if (!busca) {
        return deuCerto({
          loja: cardapio.nome,
          preparo: cardapio.preparo,
          categorias: cardapio.categorias.map((c) => ({
            nome: c.nome,
            quantidade: c.produtos.length,
          })),
        });
      }

      const achados = cardapio.categorias.flatMap((c) =>
        c.produtos
          .filter((p) => casa(p, busca))
          .map((p) => ({
            id: p.id,
            nome: p.name,
            descricao: p.description,
            categoria: c.nome,
            aPartirDeCents: p.precoMinimoCents,
            aPartirDe: preco(p.precoMinimoCents),
            /*
             * Diz se tem escolha a fazer, sem despejar os grupos. O modelo
             * chama `detalhar_produto` quando precisar — e aí paga os tokens
             * de um produto só, não do cardápio inteiro.
             */
            temOpcoes: p.grupos.length > 0,
          })),
      );

      if (achados.length === 0) {
        return deuCerto({
          achados: [],
          dica: `Nada com "${busca}". Ofereça as categorias ou peça para o cliente descrever de outro jeito.`,
        });
      }

      return deuCerto({ achados: achados.slice(0, 12) });
    },
  };
}

function casa(p: ProdutoDoCardapio, busca: string): boolean {
  const alvo = `${p.name} ${p.description ?? ''}`.toLowerCase();
  // Todas as palavras precisam aparecer: "pizza calabresa" não pode casar com
  // toda pizza do cardápio.
  return busca.split(/\s+/).every((palavra) => alvo.includes(palavra));
}

/** "R$ 13,00" — o modelo copia isto pra linha da opção, em vez de converter centavos. */
function preco(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

/**
 * Os grupos de opção de um produto, com o que é obrigatório.
 *
 * Não existe campo "obrigatório" no domínio — sai de `min`/`max`. Traduzir isso
 * aqui evita o modelo tentar deduzir da estrutura e errar: `min: 1` é escolha
 * obrigatória, `max: 2` é meio a meio, `max: 8` é "até 8".
 */
function detalharProduto(slug: string, deps: DependenciasDoLevo): Ferramenta {
  return {
    nome: 'detalhar_produto',
    descricao:
      'Mostra um produto com seus grupos de opções (tamanho, sabores, adicionais), dizendo ' +
      'quais são obrigatórios e quantas escolhas cada um aceita. Cada opção já vem com o ' +
      'preço em `preco` (ex.: "R$ 3,00") — mostre esse preço na MESMA linha do nome. ' +
      'Pergunte UM grupo por vez. Nunca despeje tamanho, base, frutas e cremes juntos.',
    schema: {
      type: 'object',
      properties: { produtoId: { type: 'string' } },
      required: ['produtoId'],
      additionalProperties: false,
    },
    async executar({ produtoId }) {
      const achado = await acharProduto(slug, deps, String(produtoId ?? ''));
      if (!achado) return deuErrado('Produto não encontrado. Busque no cardápio de novo.');

      return deuCerto({
        id: achado.id,
        nome: achado.name,
        descricao: achado.description,
        precoBaseCents: achado.priceCents,
        precoBase: preco(achado.priceCents),
        aPartirDeCents: achado.precoMinimoCents,
        aPartirDe: preco(achado.precoMinimoCents),
        grupos: achado.grupos.map((g) => ({
          id: g.id,
          nome: g.name,
          obrigatorio: g.min >= 1,
          escolhaMinima: g.min,
          escolhaMaxima: g.max,
          opcoes: g.options.map((o) => ({
            id: o.id,
            nome: o.name,
            precoCents: o.priceCents,
            preco: preco(o.priceCents),
          })),
        })),
      });
    },
  };
}

/**
 * Valida e precifica um item **sem criar pedido**.
 *
 * É a ferramenta que sustenta o guardrail de preço: o modelo nunca soma
 * complemento de cabeça — ele pergunta, e o número vem das mesmas funções que
 * o site usa. Se a escolha for inválida (falta o tamanho, escolheu demais), o
 * erro volta em texto e ele corrige com o cliente.
 */
function precificarItem(slug: string, deps: DependenciasDoLevo): Ferramenta {
  return {
    nome: 'precificar_item',
    descricao:
      'Calcula o preço exato de um item com as opções escolhidas e confere se a escolha é ' +
      'válida. Use SEMPRE antes de dizer qualquer preço de item montado. Nunca some ' +
      'complementos de cabeça.',
    schema: {
      type: 'object',
      properties: {
        produtoId: { type: 'string' },
        quantidade: { type: 'integer', minimum: 1 },
        opcoes: {
          type: 'object',
          description: 'Mapa de id do grupo para lista de ids de opção escolhidos.',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
      required: ['produtoId'],
      additionalProperties: false,
    },
    async executar({ produtoId, quantidade, opcoes }) {
      const produto = await acharProduto(slug, deps, String(produtoId ?? ''));
      if (!produto) return deuErrado('Produto não encontrado. Busque no cardápio de novo.');

      const qtd = Math.max(1, Math.trunc(Number(quantidade ?? 1)));
      const grupos = paraSpec(produto);
      const escolha = (opcoes ?? {}) as Selection;

      try {
        validarSelecao(grupos, escolha);
      } catch (cause) {
        // A mensagem do domínio já é escrita para humano ("Escolha o tamanho").
        // Devolver ela crua é melhor que traduzir e perder a precisão.
        return deuErrado(String(cause instanceof Error ? cause.message : cause));
      }

      const unitario = precoDaSelecao(Money.fromCents(produto.priceCents), grupos, escolha);

      return deuCerto({
        produtoId: produto.id,
        nome: produto.name,
        quantidade: qtd,
        opcoesEscolhidas: nomesDaSelecao(grupos, escolha),
        precoUnitarioCents: unitario.cents,
        precoUnitario: preco(unitario.cents),
        totalCents: unitario.cents * qtd,
        total: preco(unitario.cents * qtd),
      });
    },
  };
}

/**
 * A taxa de entrega de verdade.
 *
 * ⚠️ Usa a faixa por distância, **não** a taxa fixa que o cardápio exibe. Numa
 * loja com faixas, os dois números divergem — e o bot anuncia o total antes de
 * confirmar. Anunciar um valor e cobrar outro é a reclamação que chega ao
 * lojista, não a nós.
 *
 * Sem coordenada a taxa fixa é o certo: é o que o domínio faz quando não
 * consegue medir a distância.
 */
function calcularTaxaDeEntrega(slug: string, deps: DependenciasDoLevo): Ferramenta {
  return {
    nome: 'calcular_taxa_de_entrega',
    descricao:
      'Calcula a taxa de entrega para um endereço completo (rua, número, bairro, cidade). ' +
      'Use antes de informar qualquer total com entrega. Nunca estime a taxa.',
    schema: {
      type: 'object',
      properties: {
        endereco: { type: 'string', description: 'Endereço completo, com número e bairro.' },
      },
      required: ['endereco'],
      additionalProperties: false,
    },
    async executar({ endereco }) {
      const cardapio = await deps.cardapio(slug);
      if (!cardapio) return deuErrado('Loja não encontrada.');

      const texto = String(endereco ?? '').trim();
      if (texto.length < 8) return deuErrado('Endereço curto demais. Peça rua, número e bairro.');

      const padrao = Money.fromCents(cardapio.taxaFixaCents);
      const ponto = await deps.localizar(slug, texto);

      if (!ponto || cardapio.lat === null || cardapio.lng === null) {
        /*
         * Não localizou: NÃO devolve taxa.
         *
         * Medido em conversa real — o cliente perguntou por Campinas (200 km),
         * o geocodificador não achou, a ferramenta devolveu a taxa fixa e o bot
         * respondeu "a entrega aparece possível, R$ 7,00". Isso viraria pedido
         * para outro estado.
         *
         * Taxa de fallback é razoável para o cardápio web, onde o cliente
         * digitou o endereço dele e há um humano conferindo. Para um bot que
         * anuncia total e fecha pedido sozinho, é armadilha: ele lê qualquer
         * número como confirmação de que dá para entregar.
         */
        return deuErrado(
          'Não consegui localizar esse endereço no mapa, então NÃO posso confirmar ' +
            'se a loja entrega aí nem calcular a taxa. Peça o endereço completo com ' +
            'bairro e cidade. Se o cliente insistir ou o endereço for de outra cidade, ' +
            'chame alguém da loja — não confirme a entrega por conta própria.',
        );
      }

      const faixas = await deps.faixasDeTaxa(slug);
      const metros = distanciaEmMetros(cardapio.lat, cardapio.lng, ponto.lat, ponto.lng);
      const taxa = taxaPorDistancia(metros, faixas, padrao);

      return deuCerto({
        taxaCents: taxa.cents,
        taxa: preco(taxa.cents),
        distanciaMetros: Math.round(metros),
        comoFoiCalculada: faixas.length > 0 ? 'faixa por distância' : 'taxa padrão da loja',
        localizado: true,
      });
    },
  };
}

function consultarCep(deps: DependenciasDoLevo): Ferramenta {
  return {
    nome: 'consultar_cep',
    descricao:
      'Descobre rua, bairro, cidade e estado a partir de um CEP de 8 dígitos. ' +
      'Útil quando o cliente manda só o CEP — ainda será preciso pedir o número.',
    schema: {
      type: 'object',
      properties: { cep: { type: 'string' } },
      required: ['cep'],
      additionalProperties: false,
    },
    async executar({ cep }) {
      const limpo = String(cep ?? '').replace(/\D/g, '');
      if (limpo.length !== 8) return deuErrado('CEP precisa ter 8 dígitos.');

      const achado = await deps.consultarCep(limpo);
      if (!achado) return deuErrado('CEP não encontrado. Peça o endereço escrito.');

      /*
       * CEP de cidade inteira vem sem rua e sem bairro. Avisar disso evita o
       * modelo devolver "Rua: " vazio ao cliente como se fosse resposta.
       */
      return deuCerto({
        ...achado,
        precisaPerguntarRua: achado.rua === '',
        precisaPerguntarBairro: achado.bairro === '',
      });
    },
  };
}

/* ---------------------------------------------------------------- */

async function acharProduto(
  slug: string,
  deps: DependenciasDoLevo,
  produtoId: string,
): Promise<ProdutoDoCardapio | null> {
  const cardapio = await deps.cardapio(slug);
  if (!cardapio) return null;

  for (const categoria of cardapio.categorias) {
    const achado = categoria.produtos.find((p) => p.id === produtoId);
    if (achado) return achado;
  }
  return null;
}

function paraSpec(produto: ProdutoDoCardapio): OptionGroupSpec[] {
  return produto.grupos.map((g) => ({
    id: g.id,
    name: g.name,
    min: g.min,
    max: g.max,
    options: g.options.map((o) => ({ id: o.id, name: o.name, price: Money.fromCents(o.priceCents) })),
  }));
}

/** Haversine. Mesma medida que o domínio usa: linha reta, não rota. */
function distanciaEmMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export { precoMinimo };
