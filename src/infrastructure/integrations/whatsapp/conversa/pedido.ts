import { Money } from '@/core';
import { nomesDaSelecao, precoDaSelecao, precoMinimo } from '@/core/services/option-selection';
import type { EstadoDaConversa, ItemEmMontagem } from './estado';
import {
  carimbo,
  escolha,
  idDaOpcao,
  lista,
  precoEmReais,
  texto,
} from './mensagem-de-saida';
import type { Retrato, Resultado } from './motor';

/**
 * Os passos do pedido que o motor conduz sozinho.
 *
 * Nasceu da conversa real: o agente despejava tamanho + base + frutas + cremes
 * num bloco, sem preço, e depois perguntava de novo o que já tinha sido dito.
 * Aqui cada grupo é um toque, com o preço na mesma linha — e o estado guarda
 * o que já fechou, para a poda do diálogo não apagar o açaí.
 */

export interface OpcaoDoRetrato {
  id: string;
  nome: string;
  priceCents: number;
}

export interface GrupoDoRetrato {
  id: string;
  nome: string;
  min: number;
  max: number;
  opcoes: OpcaoDoRetrato[];
}

export interface ProdutoDoRetrato {
  id: string;
  nome: string;
  aPartirDeCents: number;
  priceCents?: number;
  grupos?: GrupoDoRetrato[];
}

export function aPartirDe(produto: Pick<ProdutoDoRetrato, 'priceCents' | 'grupos'>): number {
  return precoMinimo(
    Money.fromCents(produto.priceCents ?? 0),
    (produto.grupos ?? []).map(paraSpec),
  ).cents;
}

export function acharProduto(retrato: Retrato, produtoId: string): ProdutoDoRetrato | null {
  for (const cat of retrato.categorias ?? []) {
    const achado = cat.produtos.find((p) => p.id === produtoId);
    if (achado) return completar(achado);
  }
  return null;
}

/**
 * Produto cujo nome o cliente escreveu.
 *
 * "quero um açaí" e "coca" não podem cair no agente se o cardápio está no
 * retrato — foi exatamente o desvio que fez o bot esquecer o pedido.
 */
export function acharProdutoPorTexto(retrato: Retrato, bruto: string): ProdutoDoRetrato | null {
  const t = normalizar(bruto);
  if (!t) return null;

  const todos = (retrato.categorias ?? []).flatMap((c) => c.produtos).map(completar);
  const exato = todos.filter((p) => normalizar(p.nome) === t);
  if (exato.length === 1) return exato[0];

  const contem = todos.filter((p) => {
    const n = normalizar(p.nome);
    return n.includes(t) || t.includes(n);
  });
  return contem.length === 1 ? contem[0] : null;
}

export function iniciarItem(
  estado: EstadoDaConversa,
  retrato: Retrato,
  produto: ProdutoDoRetrato,
): Resultado {
  const montando: ItemEmMontagem = { productId: produto.id, grupoIndex: 0, selecao: {} };
  const comItem = {
    ...estado,
    passo: 'montando_item' as const,
    itemEmMontagem: montando,
    atualizadoEm: iso(retrato),
  };

  if (gruposDe(produto).length === 0) return fecharItem(comItem, retrato, produto);
  return perguntarGrupo(comItem, retrato, produto);
}

/**
 * Começa o item e já aplica o que a primeira fala trouxe.
 *
 * "quero um açaí de 500 de ninho" não pode perguntar o tamanho de novo — o
 * cliente já disse. Cada grupo que casar avança; o primeiro que não casar é
 * a pergunta que sobra.
 */
export function iniciarItemComTexto(
  estado: EstadoDaConversa,
  retrato: Retrato,
  produto: ProdutoDoRetrato,
  bruto: string,
): Resultado {
  const iniciado = iniciarItem(estado, retrato, produto);
  if (iniciado.estado.passo !== 'montando_item' || !bruto.trim()) return iniciado;
  const extra = aplicarTextoNaMontagem(iniciado.estado, retrato, bruto);
  return extra ?? iniciado;
}

export function continuarItem(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const produto = produtoMontando(estado, retrato);
  if (!produto) return iniciarDeNovo(estado, retrato);
  return perguntarGrupo(estado, retrato, produto);
}

export function aplicarOpcao(
  estado: EstadoDaConversa,
  retrato: Retrato,
  grupoId: string,
  opcaoId: string,
): Resultado {
  const produto = produtoMontando(estado, retrato);
  const montando = estado.itemEmMontagem;
  if (!produto || !montando) return iniciarDeNovo(estado, retrato);

  const grupo = gruposDe(produto).find((g) => g.id === grupoId);
  if (!grupo || !grupo.opcoes.some((o) => o.id === opcaoId)) {
    return perguntarGrupo(estado, retrato, produto);
  }

  const ja = montando.selecao[grupoId] ?? [];
  const semDup = ja.includes(opcaoId) ? ja : [...ja, opcaoId];
  const limitado = semDup.slice(0, grupo.max);
  const novo: ItemEmMontagem = {
    ...montando,
    selecao: { ...montando.selecao, [grupoId]: limitado },
  };
  const com = { ...estado, itemEmMontagem: novo, atualizadoEm: iso(retrato) };

  if (limitado.length >= grupo.max) return avancarGrupo(com, retrato, produto);
  return perguntarGrupo(com, retrato, produto);
}

export function pularGrupo(estado: EstadoDaConversa, retrato: Retrato, grupoId: string): Resultado {
  const produto = produtoMontando(estado, retrato);
  const montando = estado.itemEmMontagem;
  if (!produto || !montando) return iniciarDeNovo(estado, retrato);

  const grupo = gruposDe(produto).find((g) => g.id === grupoId);
  if (!grupo || grupo.min > 0) return perguntarGrupo(estado, retrato, produto);

  const com = {
    ...estado,
    itemEmMontagem: { ...montando, selecao: { ...montando.selecao, [grupoId]: [] } },
    atualizadoEm: iso(retrato),
  };
  return avancarGrupo(com, retrato, produto);
}

export function fecharGrupoAtual(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const produto = produtoMontando(estado, retrato);
  if (!produto || !estado.itemEmMontagem) return iniciarDeNovo(estado, retrato);

  const grupo = gruposDe(produto)[estado.itemEmMontagem.grupoIndex];
  const ja = grupo ? (estado.itemEmMontagem.selecao[grupo.id] ?? []) : [];
  if (grupo && ja.length < grupo.min) return perguntarGrupo(estado, retrato, produto);
  return avancarGrupo(estado, retrato, produto);
}

/**
 * Texto no meio da montagem: "500", "ninho", "banana e morango".
 *
 * O cliente da conversa real digitava em vez de tocar. Sem isto o motor
 * devolveria o menu do grupo de novo, e a sensação é de que ninguém leu.
 */
export function aplicarTextoNoGrupo(
  estado: EstadoDaConversa,
  retrato: Retrato,
  bruto: string,
): Resultado | null {
  const produto = produtoMontando(estado, retrato);
  const montando = estado.itemEmMontagem;
  if (!produto || !montando) return null;

  const grupo = gruposDe(produto)[montando.grupoIndex];
  if (!grupo) return null;

  const ja = montando.selecao[grupo.id] ?? [];

  if (/^(pronto|s[oó] isso|ok)$/i.test(bruto.trim())) {
    if (ja.length >= grupo.min) return avancarGrupo(estado, retrato, produto);
    if (grupo.min === 0) return pularGrupo(estado, retrato, grupo.id);
  }

  if (/^(sem isso|pular|nenhum|nenhuma|n[aã]o)$/i.test(bruto.trim())) {
    if (grupo.min === 0 && ja.length === 0) return pularGrupo(estado, retrato, grupo.id);
    if (ja.length >= grupo.min) return avancarGrupo(estado, retrato, produto);
  }

  const achadas = casarOpcoes(bruto, grupo);
  if (achadas.length === 0) return null;

  let atual: Resultado = { estado, respostas: [] };
  for (const op of achadas) {
    atual = aplicarOpcao(atual.estado, retrato, grupo.id, op.id);
    if (atual.estado.passo !== 'montando_item') return atual;
    if ((atual.estado.itemEmMontagem?.grupoIndex ?? 0) !== montando.grupoIndex) return atual;
  }
  const produtoAgora = produtoMontando(atual.estado, retrato) ?? produto;
  if (atual.estado.passo !== 'montando_item') return atual;
  return perguntarGrupo(atual.estado, retrato, produtoAgora);
}

/**
 * Aplica o texto em cadeia, grupo a grupo, até o primeiro que não casar.
 *
 * Sem o índice travando, "banana e morango" (max 3) perguntaria frutas para
 * sempre, tentando casar de novo as mesmas duas.
 */
export function aplicarTextoNaMontagem(
  estado: EstadoDaConversa,
  retrato: Retrato,
  bruto: string,
): Resultado | null {
  if (/^(pronto|s[oó] isso|ok|sem isso|pular|nenhum|nenhuma|n[aã]o)$/i.test(bruto.trim())) {
    return aplicarTextoNoGrupo(estado, retrato, bruto);
  }

  let atual: Resultado = { estado, respostas: [] };
  let aplicou = false;
  let ultimoIndex = -1;

  for (let i = 0; i < 8; i += 1) {
    if (atual.estado.passo !== 'montando_item') return atual;
    const idx = atual.estado.itemEmMontagem?.grupoIndex ?? -1;
    if (idx === ultimoIndex) break;
    ultimoIndex = idx;
    const r = aplicarTextoNoGrupo(atual.estado, retrato, bruto);
    if (!r) break;
    aplicou = true;
    atual = r;
  }

  return aplicou ? atual : null;
}

export function aposCarrinho(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const slug = slugDa(estado, retrato);
  const nome = nomeDa(estado, retrato);
  const total = estado.carrinho.reduce((s, i) => s + i.precoUnitarioCents * i.quantidade, 0);

  return {
    estado: { ...estado, passo: 'no_cardapio', itemEmMontagem: undefined, atualizadoEm: iso(retrato) },
    respostas: [
      escolha(
        `${carimbo(nome)}\n\n${linhasDoCarrinho(estado.carrinho)}\n\n*Subtotal: ${precoEmReais(total)}*\n\nMais alguma coisa?`,
        [
          { id: idDaOpcao({ acao: 'mais', loja: slug, alvo: '' }), rotulo: 'Mais itens' },
          { id: idDaOpcao({ acao: 'fecha', loja: slug, alvo: '' }), rotulo: 'Fechar pedido' },
        ],
      ),
    ],
  };
}

export function fecharPedido(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  if (estado.carrinho.length === 0) return iniciarDeNovo(estado, retrato);
  if (!estado.entrega) return perguntarModalidade(estado, retrato);
  if (estado.entrega === 'entrega' && !enderecoServe(estado.endereco)) {
    return pedirEndereco(estado, retrato);
  }
  if (!estado.pagamento) return perguntarPagamento(estado, retrato);
  return mostrarResumo(estado, retrato);
}

export function definirModalidade(
  estado: EstadoDaConversa,
  retrato: Retrato,
  modalidade: 'entrega' | 'retirada',
): Resultado {
  return fecharPedido({ ...estado, entrega: modalidade, atualizadoEm: iso(retrato) }, retrato);
}

export function receberEndereco(
  estado: EstadoDaConversa,
  retrato: Retrato,
  bruto: string,
): Resultado {
  const t = bruto.trim();
  const cep = t.replace(/\D/g, '');
  const soCep = cep.length === 8 && t.length <= 10;
  const soNumero = /^\d+[a-zA-Z]?$/.test(t);

  let endereco = estado.endereco;
  if (soCep) endereco = mesclarCep(endereco, formatarCep(cep));
  else if (soNumero) endereco = mesclarNumero(endereco, t);
  else if (t.length >= 3) endereco = mesclarEndereco(endereco, t);

  return seguirEndereco(
    { ...estado, endereco, entrega: 'entrega', atualizadoEm: iso(retrato) },
    retrato,
  );
}

export function definirPagamento(estado: EstadoDaConversa, retrato: Retrato, forma: string): Resultado {
  return fecharPedido({ ...estado, pagamento: forma, atualizadoEm: iso(retrato) }, retrato);
}

export function confirmarPedido(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const nome = nomeDa(estado, retrato);
  return {
    estado: { ...estado, passo: 'com_atendente', atualizadoEm: iso(retrato) },
    respostas: [
      texto(`${carimbo(nome)}\n\nPedido enviado pra loja. É só aguardar.`),
    ],
  };
}

/* ---------------------------------------------------------------- */

function avancarGrupo(
  estado: EstadoDaConversa,
  retrato: Retrato,
  produto: ProdutoDoRetrato,
): Resultado {
  const montando = estado.itemEmMontagem;
  if (!montando) return fecharItem(estado, retrato, produto);

  const proximo = { ...montando, grupoIndex: montando.grupoIndex + 1 };
  const com = { ...estado, itemEmMontagem: proximo, atualizadoEm: iso(retrato) };
  if (proximo.grupoIndex >= gruposDe(produto).length) return fecharItem(com, retrato, produto);
  return perguntarGrupo(com, retrato, produto);
}

function perguntarGrupo(
  estado: EstadoDaConversa,
  retrato: Retrato,
  produto: ProdutoDoRetrato,
): Resultado {
  const montando = estado.itemEmMontagem;
  if (!montando) return fecharItem(estado, retrato, produto);

  const grupo = gruposDe(produto)[montando.grupoIndex];
  if (!grupo) return fecharItem(estado, retrato, produto);

  const slug = slugDa(estado, retrato);
  const ja = new Set(montando.selecao[grupo.id] ?? []);
  const disponiveis = grupo.opcoes.filter((o) => !ja.has(o.id));
  const subtotal = precoParcial(produto, montando);

  const linhas = disponiveis.slice(0, 8).map((o) => {
    const delta = o.priceCents;
    const absoluto = subtotal + delta;
    const primeiro = montando.grupoIndex === 0 && ja.size === 0;
    return {
      id: idDaOpcao({ acao: 'opt', loja: slug, alvo: `${grupo.id}:${o.id}` }),
      rotulo: o.nome.slice(0, 24),
      descricao: primeiro
        ? precoEmReais(absoluto)
        : delta === 0
          ? 'incluso'
          : `+ ${precoEmReais(delta)}`,
    };
  });

  if (grupo.min === 0 && ja.size === 0) {
    linhas.push({
      id: idDaOpcao({ acao: 'skip', loja: slug, alvo: grupo.id }),
      rotulo: 'Sem isso',
      descricao: 'pular',
    });
  }
  if (ja.size >= grupo.min && ja.size > 0 && ja.size < grupo.max) {
    linhas.push({
      id: idDaOpcao({ acao: 'okgrp', loja: slug, alvo: grupo.id }),
      rotulo: 'Pronto',
      descricao: 'só isso',
    });
  } else if (grupo.min === 0 && ja.size === 0) {
    // Sem isso já cobre o pular.
  }

  const jaNomes = gruposDe(produto)
    .flatMap((g) => (montando.selecao[g.id] ?? []).map((id) => g.opcoes.find((o) => o.id === id)?.nome))
    .filter((n): n is string => Boolean(n));
  const progresso = jaNomes.length > 0 ? `\nJá: ${jaNomes.join(', ')} · ${precoEmReais(subtotal)}\n` : '\n';

  const pergunta =
    grupo.max > 1
      ? `Quais ${grupo.nome.toLowerCase()}? Pode até ${grupo.max}.`
      : `Qual ${grupo.nome.toLowerCase()}?`;

  return {
    estado: { ...estado, passo: 'montando_item', atualizadoEm: iso(retrato) },
    respostas: [
      lista(
        `${carimbo(nomeDa(estado, retrato))}\n\n*${produto.nome}*${progresso}\n${pergunta}`,
        linhas.slice(0, 10),
        grupo.nome.slice(0, 20),
      ),
    ],
  };
}

function fecharItem(
  estado: EstadoDaConversa,
  retrato: Retrato,
  produto: ProdutoDoRetrato,
): Resultado {
  const montando = estado.itemEmMontagem ?? { productId: produto.id, grupoIndex: 0, selecao: {} };
  const grupos = gruposDe(produto).map(paraSpec);
  const unitario = precoDaSelecao(Money.fromCents(produto.priceCents ?? 0), grupos, montando.selecao);
  const nomes = nomesDaSelecao(grupos, montando.selecao);

  const item = {
    productId: produto.id,
    nome: produto.nome,
    quantidade: 1,
    precoUnitarioCents: unitario.cents,
    opcoes: nomes,
  };

  return aposCarrinho(
    {
      ...estado,
      carrinho: [...estado.carrinho, item],
      itemEmMontagem: undefined,
      atualizadoEm: iso(retrato),
    },
    retrato,
  );
}

function perguntarModalidade(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const slug = slugDa(estado, retrato);
  return {
    estado: { ...estado, passo: 'entrega_ou_retirada', atualizadoEm: iso(retrato) },
    respostas: [
      escolha(`${carimbo(nomeDa(estado, retrato))}\n\nÉ para entrega ou retirada?`, [
        { id: idDaOpcao({ acao: 'mod', loja: slug, alvo: 'entrega' }), rotulo: 'Entrega' },
        { id: idDaOpcao({ acao: 'mod', loja: slug, alvo: 'retirada' }), rotulo: 'Retirada' },
      ]),
    ],
  };
}

function pedirEndereco(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  return seguirEndereco(estado, retrato);
}

function seguirEndereco(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const pergunta = perguntaFalta(estado.endereco);
  if (!pergunta) return fecharPedido(estado, retrato);
  return {
    estado: { ...estado, passo: 'endereco', atualizadoEm: iso(retrato) },
    respostas: [texto(`${carimbo(nomeDa(estado, retrato))}\n\n${pergunta}`)],
  };
}

function perguntarPagamento(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const slug = slugDa(estado, retrato);
  return {
    estado: { ...estado, passo: 'pagamento', atualizadoEm: iso(retrato) },
    respostas: [
      escolha(`${carimbo(nomeDa(estado, retrato))}\n\nComo vai pagar?`, [
        { id: idDaOpcao({ acao: 'pag', loja: slug, alvo: 'pix' }), rotulo: 'Pix' },
        { id: idDaOpcao({ acao: 'pag', loja: slug, alvo: 'dinheiro' }), rotulo: 'Dinheiro' },
        { id: idDaOpcao({ acao: 'pag', loja: slug, alvo: 'cartao' }), rotulo: 'Cartão' },
      ]),
    ],
  };
}

function mostrarResumo(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const slug = slugDa(estado, retrato);
  const nome = nomeDa(estado, retrato);

  return {
    estado: { ...estado, passo: 'confirmando', atualizadoEm: iso(retrato) },
    respostas: [
      texto(`${carimbo(nome)}\n\n${blocoDoPedido(estado)}`),
      escolha('Confirma o pedido?', [
        { id: idDaOpcao({ acao: 'conf', loja: slug, alvo: '' }), rotulo: 'Confirmar' },
        { id: idDaOpcao({ acao: 'mais', loja: slug, alvo: '' }), rotulo: 'Alterar' },
      ]),
    ],
  };
}

function blocoDoPedido(estado: EstadoDaConversa): string {
  const total = estado.carrinho.reduce((s, i) => s + i.precoUnitarioCents * i.quantidade, 0);
  const pagamento =
    estado.pagamento === 'pix' ? 'Pix' : estado.pagamento === 'dinheiro' ? 'Dinheiro' : 'Cartão';
  const entrega =
    estado.entrega === 'retirada'
      ? '*Entrega*\nRetirada na loja'
      : `*Entrega*\n${formatarEnderecoExibicao(estado.endereco ?? '')}`;

  return [
    '*Pedido*',
    linhasDoCarrinho(estado.carrinho),
    '',
    entrega,
    '',
    `*Pagamento*\n${pagamento}`,
    '',
    `*Total: ${precoEmReais(total)}*`,
  ].join('\n');
}

function linhasDoCarrinho(carrinho: EstadoDaConversa['carrinho']): string {
  return carrinho
    .map((i) => {
      const preco = precoEmReais(i.precoUnitarioCents * i.quantidade);
      const cabeca = `${i.quantidade}× ${i.nome} — ${preco}`;
      const extras = i.opcoes.length > 0 ? `\n_${i.opcoes.join(' · ')}_` : '';
      return `${cabeca}${extras}`;
    })
    .join('\n\n');
}

function formatarEnderecoExibicao(endereco: string): string {
  const cep = endereco.match(/\d{5}-\d{3}/)?.[0];
  const num = endereco.match(/n[ºo°]\s*(\S+)/i)?.[1];
  const bairroNome = endereco.match(/bairro\s+([^,\n]+)/i)?.[1]?.trim();
  const resto = endereco
    .replace(/\d{5}-\d{3}/g, '')
    .replace(/,?\s*n[ºo°]\s*\S+/gi, '')
    .replace(/,?\s*bairro\s+[^,\n]+/i, '')
    .replace(/,\s*,/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '');

  let rua = resto;
  let bairro = bairroNome;
  if (!bairro && resto.includes(',')) {
    const partes = resto.split(',').map((s) => s.trim()).filter(Boolean);
    rua = partes[0] ?? resto;
    bairro = partes.slice(1).join(', ') || undefined;
  }

  const linhas: string[] = [];
  if (rua && num) linhas.push(`${rua}, nº ${num}`);
  else if (rua) linhas.push(rua);
  else if (num) linhas.push(`nº ${num}`);
  if (bairro) {
    linhas.push(/^bairro\b/i.test(bairro) ? bairro : `Bairro ${bairro}`);
  }
  if (cep) linhas.push(`CEP ${cep}`);
  return linhas.join('\n') || endereco;
}

function iniciarDeNovo(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const categorias = retrato.categorias ?? [];
  if (categorias.length === 0) {
    return {
      estado: { ...estado, passo: 'no_cardapio', atualizadoEm: iso(retrato) },
      respostas: [],
      delegarAoAgente: true,
    };
  }
  const slug = slugDa(estado, retrato);
  return {
    estado: { ...estado, passo: 'no_cardapio', itemEmMontagem: undefined, atualizadoEm: iso(retrato) },
    respostas: [
      lista(
        `${carimbo(nomeDa(estado, retrato))}\n\nO que você quer pedir?`,
        categorias.slice(0, 10).map((c) => ({
          id: idDaOpcao({ acao: 'cat', loja: slug, alvo: c.nome }),
          rotulo: c.nome.slice(0, 24),
        })),
        'Categorias',
      ),
    ],
  };
}

function produtoMontando(estado: EstadoDaConversa, retrato: Retrato): ProdutoDoRetrato | null {
  return estado.itemEmMontagem ? acharProduto(retrato, estado.itemEmMontagem.productId) : null;
}

function precoParcial(produto: ProdutoDoRetrato, montando: ItemEmMontagem): number {
  return precoDaSelecao(
    Money.fromCents(produto.priceCents ?? 0),
    gruposDe(produto).map(paraSpec),
    montando.selecao,
  ).cents;
}

function casarOpcoes(bruto: string, grupo: GrupoDoRetrato): OpcaoDoRetrato[] {
  const achadas: OpcaoDoRetrato[] = [];

  const nums = bruto.match(/\d{2,4}/g) ?? [];
  for (const num of nums) {
    const hit = grupo.opcoes.find((o) => o.nome.replace(/\s/g, '').toLowerCase().includes(num));
    if (hit && !achadas.some((a) => a.id === hit.id)) achadas.push(hit);
  }

  const palavras = normalizar(bruto)
    .split(/\s+/)
    .filter((s) => s.length >= 3 && !/^\d+$/.test(s) && !STOP.has(s));

  for (const palavra of palavras) {
    const hit = grupo.opcoes.find((o) => casaNome(palavra, o.nome));
    if (hit && !achadas.some((a) => a.id === hit.id)) achadas.push(hit);
  }

  // "açaí de ninho": as duas casam na base; a última é a que o cliente quis.
  if (grupo.max === 1 && achadas.length > 1) return [achadas[achadas.length - 1]];
  return achadas.slice(0, grupo.max);
}

const STOP = new Set(['com', 'para', 'por', 'uma', 'uns', 'dos', 'das', 'sem']);

function casaNome(token: string, nome: string): boolean {
  const n = normalizar(nome);
  if (!token || !n) return false;
  if (n === token) return true;
  if (token.length >= 3 && n.includes(token)) return true;
  return false;
}

function completar(p: ProdutoDoRetrato): ProdutoDoRetrato {
  return {
    ...p,
    priceCents: p.priceCents ?? p.aPartirDeCents,
    grupos: gruposDe(p),
  };
}

function gruposDe(p: ProdutoDoRetrato): GrupoDoRetrato[] {
  return p.grupos ?? [];
}

function paraSpec(grupo: GrupoDoRetrato) {
  return {
    id: grupo.id,
    name: grupo.nome,
    min: grupo.min,
    max: grupo.max,
    options: grupo.opcoes.map((o) => ({
      id: o.id,
      name: o.nome,
      price: Money.fromCents(o.priceCents),
    })),
  };
}

export function enderecoServe(endereco?: string): boolean {
  return perguntaFalta(endereco) === null;
}

/**
 * O próximo pedaço que falta, na ordem que o motoboy precisa.
 *
 * Mandou só a rua? Guarda e pede o número. Mandou rua e número? Pede o
 * bairro. Completo só quando os três estão lá — CEP ajuda, mas não substitui.
 */
function perguntaFalta(endereco?: string): string | null {
  if (!endereco?.trim()) return 'Me passa rua, número e bairro — ou o CEP.';
  const n = temNumero(endereco);
  const r = temRua(endereco);
  const b = temBairro(endereco);
  if (n && r && b) return null;
  if (!n) {
    const cep = endereco.match(/\d{5}-\d{3}/);
    return cep && !r ? `CEP ${cep[0]}. Qual o número da casa?` : 'Qual o número da casa?';
  }
  if (!r && !b) return 'Qual a rua e o bairro?';
  if (!r) return 'Qual a rua?';
  return 'Qual o bairro?';
}

function temNumero(endereco: string): boolean {
  if (/n[ºo°]\s*\S/i.test(endereco)) return true;
  const semCep = endereco.replace(/\d{5}-?\d{3}/g, '');
  return /\d/.test(semCep);
}

function temRua(endereco: string): boolean {
  const semMeta = endereco
    .replace(/\d{5}-?\d{3}/g, '')
    .replace(/n[ºo°]\s*\S+/gi, '')
    .replace(/\bbairro\b.+/i, '');
  return /[A-Za-zÀ-ú]{5,}/.test(semMeta);
}

function temBairro(endereco: string): boolean {
  if (/\bbairro\b/i.test(endereco)) return true;
  const soLogradouro = endereco
    .replace(/\d{5}-\d{3}/g, '')
    .replace(/,?\s*n[ºo°]?\s*\S+/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
  return soLogradouro.includes(',');
}

function mesclarCep(atual: string | undefined, cep: string): string {
  if (!atual) return cep;
  const sem = atual.replace(/\d{5}-\d{3}/g, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
  return sem ? `${sem}, ${cep}` : cep;
}

function mesclarNumero(atual: string | undefined, n: string): string {
  if (!atual) return `nº ${n}`;
  if (/n[ºo°]\s*\S+/i.test(atual)) return atual.replace(/n[ºo°]\s*\S+/i, `nº ${n}`);
  return `${atual}, nº ${n}`;
}

function mesclarEndereco(atual: string | undefined, t: string): string {
  if (!atual) return t;

  const soBairro = /\bbairro\b/i.test(t) && !/\b(rua|avenida|alameda|travessa|estrada)\b/i.test(t);
  if (soBairro || (!temBairro(atual) && temRua(atual) && !/\b(rua|avenida|alameda|travessa)\b/i.test(t))) {
    const sem = atual.replace(/,?\s*bairro\s+[^,]+/i, '').replace(/,\s*$/, '');
    const bairro = /bairro/i.test(t) ? t.trim() : `bairro ${t.trim()}`;
    return `${sem}, ${bairro}`;
  }

  if (!temRua(atual)) return atual ? `${t}, ${atual}` : t;

  const cepNum = atual.match(/\d{5}-\d{3}(?:, nº \S+)?/);
  if (/\b(rua|avenida|alameda|travessa)\b/i.test(t) && cepNum && !t.includes(cepNum[0])) {
    return `${t}, ${cepNum[0]}`;
  }
  return t;
}

function formatarCep(cep: string): string {
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/quero(?:\s+(umas|uns|uma|um|o|a))?\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugDa(estado: EstadoDaConversa, retrato: Retrato): string {
  return estado.lojaEmFoco ? (retrato.slugDaLoja[estado.lojaEmFoco] ?? '') : '';
}

function nomeDa(estado: EstadoDaConversa, retrato: Retrato): string {
  return retrato.nomeDaLoja[estado.lojaEmFoco ?? ''] ?? 'a loja';
}

function iso(retrato: Retrato): string {
  return retrato.agora.toISOString();
}
