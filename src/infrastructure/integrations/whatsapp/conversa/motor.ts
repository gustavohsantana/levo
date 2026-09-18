import type { MensagemRecebida } from '../webhook-protocol';
import type { Resolucao } from '../resolver-loja';
import {
  carimbo,
  escolha,
  idDaOpcao,
  lerIntencao,
  lista,
  precoEmReais,
  texto,
  type MensagemDeSaida,
} from './mensagem-de-saida';
import {
  carrinhoExpirou,
  estadoInicial,
  type EstadoDaConversa,
} from './estado';
import {
  acharProduto,
  acharProdutoPorTexto,
  aplicarOpcao,
  aplicarTextoNaMontagem,
  confirmarPedido,
  continuarItem,
  definirModalidade,
  definirPagamento,
  enderecoServe,
  fecharGrupoAtual,
  fecharPedido,
  iniciarItem,
  iniciarItemComTexto,
  pularGrupo,
  receberEndereco,
} from './pedido';

/**
 * O motor da conversa.
 *
 * **Função pura de propósito.** Recebe estado + mensagem + um retrato dos dados
 * de que precisa, e devolve estado novo + o que dizer. Não toca banco, não faz
 * rede, não envia nada.
 *
 * Isso não é purismo: é o que permite rodar um diálogo inteiro num teste e
 * IMPRIMIR a conversa. Texto e ordem de pergunta são onde um bot de pedido
 * irrita ou encanta, e isso só se descobre lendo o diálogo — não o código.
 *
 * ⚠️ **Esqueleto.** Abertura, menu, montagem do item, endereço e pagamento o
 * motor resolve sozinho. O agente só entra no que ainda não tem passo — e o
 * motor declara isso, em vez de fingir que sabe.
 */

/** O que o motor precisa saber sobre o mundo, já carregado por quem o chama. */
export interface Retrato {
  agora: Date;
  /** De qual loja é esta conversa, pela escada do resolvedor. */
  resolucao: Resolucao;
  /** Nome de exibição por id de loja — para o carimbo e as listas. */
  nomeDaLoja: Record<string, string>;
  /** Slug por id de loja, usado nos `id` das opções. */
  slugDaLoja: Record<string, string>;
  /**
   * Pedidos que ainda não terminaram, de TODAS as lojas.
   *
   * Vêm juntos de propósito: quem escreve "oi" com pizza a caminho está
   * perguntando da pizza, não pedindo cardápio. E os dois pedidos aparecem
   * carimbados, para nenhuma loja ficar escondida atrás da outra.
   */
  pedidosEmAndamento: { id: string; displayId: string | null; lojaId: string; situacao: string }[];
  /**
   * Categorias do cardápio da loja em foco, quando já carregadas.
   *
   * Medido em produção: o cliente pediu "manda as categorias pra eu clicar".
   * Sem isto o agente despeja texto, a formatação quebra no celular, e não há
   * o que tocar. Com isto o motor responde o menu — grátis, previsível, e no
   * formato que o WhatsApp desenha como lista.
   */
  categorias?: CategoriaDoRetrato[];
}

export interface CategoriaDoRetrato {
  nome: string;
  produtos: import('./pedido').ProdutoDoRetrato[];
}

export interface Resultado {
  estado: EstadoDaConversa;
  respostas: MensagemDeSaida[];
  /**
   * O determinístico não soube responder — quem chama deve perguntar ao agente.
   *
   * É assim que o híbrido funciona sem o motor deixar de ser puro: ele não
   * chama o modelo, ele **declara** que não sabe. Quem orquestra é que tem
   * banco e rede.
   *
   * E é o que mantém o custo em pé: enquanto o cliente toca em botões, isto
   * nunca fica verdadeiro, e nenhum token é gasto.
   */
  delegarAoAgente?: boolean;
}

export function avancar(
  estadoAtual: EstadoDaConversa,
  msg: MensagemRecebida,
  retrato: Retrato,
): Resultado {
  const expirado = carrinhoExpirou(estadoAtual, retrato.agora)
    ? { ...estadoInicial(), lojaEmFoco: estadoAtual.lojaEmFoco }
    : estadoAtual;

  const estado = lembrarOQueJaDisse(expirado, msg);

  /*
   * Com atendente, o bot cala a boca.
   *
   * Duas vozes na mesma conversa é pior que bot nenhum: o cliente não sabe com
   * quem está falando e repete a pergunta. Quem devolve para o bot é o
   * atendente, pelo painel — nunca o próprio bot.
   */
  if (estado.passo === 'com_atendente') {
    const t = msg.texto ?? '';
    if (saudacao(t) || /novo pedido|pedir de novo|quero pedir/i.test(t)) {
      const limpo: EstadoDaConversa = {
        ...estado,
        passo: 'ocioso',
        carrinho: [],
        pagamento: undefined,
        itemEmMontagem: undefined,
        atualizadoEm: iso(retrato.agora),
      };
      if ((retrato.categorias?.length ?? 0) > 0) return abrirCardapio(limpo, retrato);
    }
    return { estado, respostas: [] };
  }

  /*
   * Áudio, foto, figurinha, documento: o bot não vê.
   *
   * Medido em produção: o cliente mandou áudio e o webhook chegou com texto
   * nulo. O agente recebeu uma fala vazia, improvisou, e a conversa saiu do
   * trilho. Responder aqui — sem gastar modelo — é o que o prompt já pedia e
   * o motor não fazia.
   */
  if (SEM_TEXTO.has(msg.tipo)) {
    return {
      estado: { ...estado, atualizadoEm: iso(retrato.agora) },
      respostas: [texto(soLeioTexto(estado, retrato))],
    };
  }

  /*
   * Pin de localização.
   *
   * Quem manda o pin está pedindo ENTREGA — perguntar "entrega ou retirada?"
   * depois disso foi o que irritou na conversa real. O pin sozinho não serve
   * para o motoboy: falta número, complemento, ponto de referência.
   */
  if (msg.tipo === 'location') {
    const comPin: EstadoDaConversa = {
      ...estado,
      entrega: 'entrega',
      passo: estado.carrinho.length > 0 && !enderecoServe(estado.endereco) ? 'endereco' : estado.passo,
      atualizadoEm: iso(retrato.agora),
    };
    if (estado.carrinho.length > 0 && enderecoServe(estado.endereco)) {
      return fecharPedido(comPin, retrato);
    }
    return {
      estado: comPin,
      respostas: [texto(recebiOPin(comPin, retrato))],
    };
  }

  const intencao = lerIntencao(msg.opcaoId);

  /*
   * O toque tem prioridade sobre o passo.
   *
   * O `id` carrega loja e alvo, então ele é sempre mais confiável que o estado
   * — que pode ter mudado entre o bot mandar a opção e o cliente tocar nela.
   */
  if (intencao?.acao === 'loja') {
    const lojaId = idPorSlug(retrato, intencao.alvo);
    if (lojaId) {
      const comLoja = { ...estado, lojaEmFoco: lojaId };
      if ((retrato.categorias?.length ?? 0) > 0 && retrato.pedidosEmAndamento.length === 0) {
        return abrirCardapio(comLoja, retrato);
      }
      return abrirAtendimento(comLoja, retrato);
    }
  }

  if (intencao?.acao === 'humano') {
    return {
      estado: { ...estado, passo: 'com_atendente', atualizadoEm: iso(retrato.agora) },
      respostas: [texto('Certo! Já chamei alguém da loja. É só aguardar aqui. 👍')],
    };
  }

  if (intencao?.acao === 'cat') {
    const categoria = (retrato.categorias ?? []).find((c) => c.nome === intencao.alvo);
    if (categoria) return listarProdutos(estado, retrato, categoria);
  }

  if (intencao?.acao === 'item') {
    const produto = acharProduto(retrato, intencao.alvo);
    if (produto) return iniciarItem(estado, retrato, produto);
  }

  if (intencao?.acao === 'opt') {
    const [grupoId, opcaoId] = intencao.alvo.split(':');
    if (grupoId && opcaoId) return aplicarOpcao(estado, retrato, grupoId, opcaoId);
  }

  if (intencao?.acao === 'skip') return pularGrupo(estado, retrato, intencao.alvo);
  if (intencao?.acao === 'okgrp') return fecharGrupoAtual(estado, retrato);
  if (intencao?.acao === 'mais') return abrirCardapio(estado, retrato);
  if (intencao?.acao === 'fecha') return fecharPedido(estado, retrato);
  if (intencao?.acao === 'mod' && (intencao.alvo === 'entrega' || intencao.alvo === 'retirada')) {
    return definirModalidade(estado, retrato, intencao.alvo);
  }
  if (intencao?.acao === 'pag') return definirPagamento(estado, retrato, intencao.alvo);
  if (intencao?.acao === 'conf') return confirmarPedido(estado, retrato);

  if (intencao?.acao === 'novo') {
    return abrirCardapio({ ...estado, passo: 'ocioso', itemEmMontagem: undefined }, retrato);
  }

  // A loja ainda não é conhecida: desce a escada.
  if (!estado.lojaEmFoco) return resolverLojaPrimeiro(estado, retrato, msg);

  if (
    estado.carrinho.length > 0 &&
    estado.passo !== 'montando_item' &&
    estado.passo !== 'confirmando' &&
    msg.texto &&
    /finaliz|fechar pedido|pode (fechar|mandar)|s[oó] isso/i.test(msg.texto)
  ) {
    return fecharPedido(estado, retrato);
  }

  if (estado.passo === 'montando_item') {
    const peloTexto = aplicarTextoNaMontagem(estado, retrato, msg.texto ?? '');
    if (peloTexto) return peloTexto;
    const produto = acharProdutoPorTexto(retrato, msg.texto ?? '');
    if (produto && produto.id !== estado.itemEmMontagem?.productId) {
      return iniciarItemComTexto(estado, retrato, produto, msg.texto ?? '');
    }
    return continuarItem(estado, retrato);
  }

  if (estado.passo === 'endereco' && msg.texto) {
    return receberEndereco(estado, retrato, msg.texto);
  }

  if (estado.passo === 'entrega_ou_retirada' && msg.texto) {
    const t = msg.texto.toLowerCase();
    if (/\bretirada\b/.test(t) || /\bbeuscar\b/.test(t)) {
      return definirModalidade(estado, retrato, 'retirada');
    }
    if (/\bentrega\b/.test(t)) return definirModalidade(estado, retrato, 'entrega');
  }

  if (estado.passo === 'pagamento' && msg.texto) {
    const t = msg.texto.toLowerCase();
    if (/pix/.test(t)) return definirPagamento(estado, retrato, 'pix');
    if (/dinheiro|especie|esp[eé]cie/.test(t)) return definirPagamento(estado, retrato, 'dinheiro');
    if (/cart[aã]o|credito|d[eé]bito/.test(t)) return definirPagamento(estado, retrato, 'cartao');
    if (pareceEndereco(msg.texto)) return receberEndereco(estado, retrato, msg.texto);
  }

  if (estado.passo === 'confirmando' && msg.texto) {
    if (pareceEndereco(msg.texto)) return receberEndereco(estado, retrato, msg.texto);
    if (/alterar|mudar|mais item/i.test(msg.texto)) {
      return abrirCardapio(estado, retrato);
    }
    if (querConfirmar(msg.texto)) return confirmarPedido(estado, retrato);
    return fecharPedido(estado, retrato);
  }

  return comLojaDefinida(estado, retrato, msg);
}

/* ---------------------------------------------------------------- */
/* Abertura                                                          */
/* ---------------------------------------------------------------- */

/**
 * Quando a loja não se sabe.
 *
 * A regra que atravessa este bloco: **o bot nunca apresenta uma loja que o
 * cliente não escolheu antes.** Sem descoberta, sem "perto de você", sem
 * ranking. O Levô é o encanamento entre a loja e o cliente dela — não uma
 * vitrine que mostra o concorrente para quem a loja trouxe.
 */
function resolverLojaPrimeiro(
  estado: EstadoDaConversa,
  retrato: Retrato,
  msg: MensagemRecebida,
): Resultado {
  const { resolucao } = retrato;

  if (resolucao.tipo === 'loja') {
    return comLojaDefinida({ ...estado, lojaEmFoco: resolucao.establishmentId }, retrato, msg);
  }

  if (resolucao.tipo === 'escolher') {
    /*
     * Pergunta NEUTRA. Sugerir a mais recente seria o Levô eleger favorita
     * entre duas lojas que pagam por ele. A ordem é conveniência de memória;
     * quem escolhe é o cliente.
     */
    const opcoes = resolucao.opcoes.map((o) => ({
      id: idDaOpcao({ acao: 'loja', loja: retrato.slugDaLoja[o.establishmentId] ?? '', alvo: retrato.slugDaLoja[o.establishmentId] ?? '' }),
      rotulo: retrato.nomeDaLoja[o.establishmentId] ?? 'Loja',
    }));

    return {
      estado: { ...estado, passo: 'escolhendo_loja', atualizadoEm: iso(retrato.agora) },
      respostas: [escolha('Onde você quer pedir hoje?', opcoes, 'Minhas lojas')],
    };
  }

  return {
    estado: { ...estado, passo: 'escolhendo_loja', atualizadoEm: iso(retrato.agora) },
    respostas: [
      texto(
        'Oi! 👋 Sou o assistente do Levô.\n\n' +
          'Para começar, me diz o nome da loja onde você quer pedir — ' +
          'ou use o link do cardápio dela.',
      ),
    ],
  };
}

function comLojaDefinida(
  estado: EstadoDaConversa,
  retrato: Retrato,
  msg: MensagemRecebida,
): Resultado {
  /*
   * Pediu o cardápio em texto, ou só cumprimentou. Volta o menu clicável — é
   * o que o cliente pediu na conversa real ("manda as categorias pra eu
   * clicar") e o que o agente não consegue desenhar, porque só gera texto.
   *
   * "Quero um açaí" NÃO cai aqui: já é um pedido, e o motor começa a montar.
   */
  const temCardapio = (retrato.categorias?.length ?? 0) > 0;
  if (
    temCardapio &&
    retrato.pedidosEmAndamento.length === 0 &&
    (pedindoCardapio(msg.texto) || saudacao(msg.texto))
  ) {
    return abrirCardapio(estado, retrato);
  }

  const produto = acharProdutoPorTexto(retrato, msg.texto ?? '');
  if (produto) return iniciarItemComTexto(estado, retrato, produto, msg.texto ?? '');

  if (estado.passo === 'endereco' && msg.texto) {
    return receberEndereco(estado, retrato, msg.texto);
  }

  return abrirAtendimento(estado, retrato);
}

/**
 * A abertura com a loja já definida.
 *
 * Quem tem pedido a caminho e escreve "oi" está perguntando DO PEDIDO. Abrir
 * com cardápio nesse momento é surdez — e é o que faz o cliente desistir e
 * ligar no telefone, que é justamente o que o Levô existe para evitar.
 */
function abrirAtendimento(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const emAndamento = retrato.pedidosEmAndamento;

  if (emAndamento.length > 0) {
    const linhas = emAndamento
      .map((p) => `${carimbo(retrato.nomeDaLoja[p.lojaId] ?? 'Loja', p.displayId)} — ${p.situacao}`)
      .join('\n');

    const opcoes = emAndamento.slice(0, 2).map((p) => ({
      id: idDaOpcao({ acao: 'acompanhar', loja: retrato.slugDaLoja[p.lojaId] ?? '', alvo: p.id }),
      rotulo: `Acompanhar #${p.displayId ?? '—'}`.slice(0, 20),
    }));
    opcoes.push({
      id: idDaOpcao({ acao: 'novo', loja: slugEmFoco(estado, retrato), alvo: '' }),
      rotulo: 'Fazer novo pedido',
    });

    return {
      estado: { ...estado, passo: 'no_cardapio', atualizadoEm: iso(retrato.agora) },
      respostas: [escolha(`Oi! 👋\n\n${linhas}`, opcoes)],
    };
  }

  return {
    estado: { ...estado, passo: 'no_cardapio', atualizadoEm: iso(retrato.agora) },
    respostas: [],
    delegarAoAgente: true,
  };
}

function abrirCardapio(estado: EstadoDaConversa, retrato: Retrato): Resultado {
  const categorias = retrato.categorias ?? [];
  if (categorias.length === 0) {
    return {
      estado: { ...estado, passo: 'no_cardapio', atualizadoEm: iso(retrato.agora) },
      respostas: [],
      delegarAoAgente: true,
    };
  }

  const slug = slugEmFoco(estado, retrato);
  const nome = retrato.nomeDaLoja[estado.lojaEmFoco ?? ''] ?? 'a loja';
  const opcoes = categorias.slice(0, 10).map((c) => ({
    id: idDaOpcao({ acao: 'cat', loja: slug, alvo: c.nome }),
    rotulo: c.nome.slice(0, 24),
  }));

  return {
    estado: { ...estado, passo: 'no_cardapio', atualizadoEm: iso(retrato.agora) },
    respostas: [
      lista(`${carimbo(nome)}\n\nOi! 👋 O que você quer pedir hoje?`, opcoes, 'Categorias'),
    ],
  };
}

function listarProdutos(
  estado: EstadoDaConversa,
  retrato: Retrato,
  categoria: CategoriaDoRetrato,
): Resultado {
  const slug = slugEmFoco(estado, retrato);
  const nome = retrato.nomeDaLoja[estado.lojaEmFoco ?? ''] ?? 'a loja';
  const opcoes = categoria.produtos.slice(0, 10).map((p) => ({
    id: idDaOpcao({ acao: 'item', loja: slug, alvo: p.id }),
    rotulo: p.nome.slice(0, 24),
    descricao: `a partir de ${precoEmReais(p.aPartirDeCents)}`,
  }));

  return {
    estado: { ...estado, passo: 'no_cardapio', atualizadoEm: iso(retrato.agora) },
    respostas: [lista(`${carimbo(nome)}\n\n*${categoria.nome}*`, opcoes, 'Produtos')],
  };
}

/* ---------------------------------------------------------------- */

/**
 * Frases que, na conversa real, significavam "mostra o cardápio".
 *
 * Sem isto o agente respondia com um bloco de texto, e o cliente pedia o menu
 * clicável de novo. O motor reconhece e devolve a lista.
 */
const PEDINDO_CARDAPIO =
  /card[aá]pio|categorias|ver o menu|o que.{0,16}(vende|tem)|quais.{0,12}tem/i;

function pedindoCardapio(textoDoCliente: string | null): boolean {
  return Boolean(textoDoCliente && PEDINDO_CARDAPIO.test(textoDoCliente));
}

function querConfirmar(textoDoCliente: string): boolean {
  const t = textoDoCliente.trim();
  if (t.length > 80) return false;
  return (
    /^(ok|sim|isso|certo|pode|blz|beleza|fechou|valeu|perfeito|confirma(r)?)([,!.\s]+(obrigad\w*|valeu|sim|isso|mesmo|pode|confirmar|perfeito)*)*[.!?]*$/i.test(
      t,
    ) ||
    /s[oó] isso/i.test(t) ||
    /^obrigad/i.test(t)
  );
}

function pareceEndereco(textoDoCliente: string): boolean {
  return (
    /\b(rua|r\.|av\.|avenida|alameda|bairro|travessa|estrada)\b/i.test(textoDoCliente) ||
    /^\d{5}-?\d{3}$/.test(textoDoCliente.trim())
  );
}

function saudacao(textoDoCliente: string | null): boolean {
  if (!textoDoCliente || !textoDoCliente.trim()) return true;
  return /^(oi+|ol[aá]|oie|hey|e a[ií]|bom dia|boa tarde|boa noite)[\s!.]*$/i.test(
    textoDoCliente.trim(),
  );
}

const SEM_TEXTO = new Set(['audio', 'image', 'video', 'sticker', 'document']);

/**
 * Marca entrega/retirada no estado quando o cliente já disse.
 *
 * O modelo não pode ser a memória disto: a poda do diálogo come o "entrega"
 * de dez turnos atrás, e ele pergunta de novo. O estado sobrevive.
 */
function lembrarOQueJaDisse(estado: EstadoDaConversa, msg: MensagemRecebida): EstadoDaConversa {
  const t = (msg.texto ?? '').toLowerCase();
  if (!t) return estado;

  let next = estado;

  if (/\bretirada\b/.test(t) || /\bbeuscar\b/.test(t)) {
    next = { ...next, entrega: 'retirada' };
  } else if (/\bentrega\b/.test(t) || /\b\d{5}-?\d{3}\b/.test(t)) {
    next = { ...next, entrega: next.entrega ?? 'entrega' };
  }

  if (/\bpix\b/.test(t)) {
    next = { ...next, pagamento: next.pagamento ?? 'pix' };
  }

  if (next.passo === 'montando_item') return next;

  const soDigitos = t.replace(/\D/g, '');
  if (soDigitos.length === 8 && t.trim().length <= 10) {
    return {
      ...next,
      entrega: next.entrega ?? 'entrega',
      endereco: next.endereco ?? `${soDigitos.slice(0, 5)}-${soDigitos.slice(5)}`,
    };
  }

  if (
    /\b(rua|r\.|av\.|avenida|alameda|bairro|travessa)\b/.test(t) &&
    /\d/.test(t) &&
    t.trim().length >= 12
  ) {
    return {
      ...next,
      entrega: next.entrega ?? 'entrega',
      endereco: next.endereco ?? (msg.texto ?? '').trim(),
    };
  }

  return next;
}

function soLeioTexto(estado: EstadoDaConversa, retrato: Retrato): string {
  const nome = retrato.nomeDaLoja[estado.lojaEmFoco ?? ''] ?? 'a loja';
  const prefixo = estado.lojaEmFoco ? `${carimbo(nome)}\n\n` : '';
  return `${prefixo}Por aqui eu só leio texto. Pode escrever o que você precisa?`;
}

function recebiOPin(estado: EstadoDaConversa, retrato: Retrato): string {
  const nome = retrato.nomeDaLoja[estado.lojaEmFoco ?? ''] ?? 'a loja';
  const prefixo = estado.lojaEmFoco ? `${carimbo(nome)}\n\n` : '';
  return (
    `${prefixo}Recebi sua localização. Pra entrega, me confirma rua, número e ` +
    `bairro — ou o CEP. O pin sozinho não dá pra quem for entregar achar.`
  );
}

function idPorSlug(retrato: Retrato, slug: string): string | null {
  const achado = Object.entries(retrato.slugDaLoja).find(([, s]) => s === slug);
  return achado ? achado[0] : null;
}

function slugEmFoco(estado: EstadoDaConversa, retrato: Retrato): string {
  return estado.lojaEmFoco ? (retrato.slugDaLoja[estado.lojaEmFoco] ?? '') : '';
}

function iso(d: Date): string {
  return d.toISOString();
}
