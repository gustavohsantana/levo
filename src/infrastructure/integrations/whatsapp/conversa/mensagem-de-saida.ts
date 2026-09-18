/**
 * O que o bot manda, descrito sem saber como se envia.
 *
 * O motor da conversa devolve estas estruturas; quem traduz para o formato da
 * Cloud API é o `envio`. A separação existe para o motor continuar sendo lógica
 * pura, testável imprimindo o diálogo — e para o dia em que a mesma conversa
 * precisar sair por outro canal (Telegram, cardápio) sem reescrever nada.
 */

/** Um toque possível. O `id` é nosso e volta intacto no webhook. */
export interface Opcao {
  id: string;
  /** O que o cliente lê. O WhatsApp trunca em 20 caracteres no botão. */
  rotulo: string;
  /** Segunda linha, só em lista. Trunca em 72. */
  descricao?: string;
}

export type MensagemDeSaida =
  | { tipo: 'texto'; corpo: string }
  /** Até 3 opções. Acima disso o WhatsApp recusa, e é preciso lista. */
  | { tipo: 'botoes'; corpo: string; opcoes: Opcao[] }
  /** Até 10 linhas. `rotuloDoBotao` é o texto que abre a lista. */
  | { tipo: 'lista'; corpo: string; rotuloDoBotao: string; opcoes: Opcao[] }
  /** Foto com legenda. Lista do WhatsApp não cabe imagem por linha. */
  | { tipo: 'imagem'; url: string; corpo: string };

/* ---------------------------------------------------------------- */
/* O id que carrega o contexto                                       */
/* ---------------------------------------------------------------- */

/**
 * A intenção por trás de um toque, colada no `id` da opção.
 *
 * Existe porque o estado da conversa **não é confiável para interpretar uma
 * resposta**: o cliente responde um botão de dez minutos atrás quando já está
 * falando com outra loja, e um "Confirmar" solto cairia na cozinha errada. Com
 * a loja e o alvo no próprio `id`, o toque se autodescreve.
 *
 * Formato: `acao:loja:alvo` — sem espaços, porque o campo é curto (200 chars) e
 * qualquer separador exótico só dificultaria a leitura no log.
 */
export interface Intencao {
  acao: string;
  /** Slug da loja. Vazio quando a ação não pertence a nenhuma. */
  loja: string;
  /** Produto, pedido, categoria — o que a ação precisar. */
  alvo: string;
}

export function idDaOpcao(intencao: Intencao): string {
  return [intencao.acao, intencao.loja, intencao.alvo].join(':');
}

/**
 * Lê o `id` de volta. Devolve `null` para o que não veio de um toque nosso —
 * texto digitado, ou um id de formato antigo depois de um deploy.
 */
export function lerIntencao(id: string | null): Intencao | null {
  if (!id) return null;

  const partes = id.split(':');
  if (partes.length < 3) return null;

  const [acao, loja, ...resto] = partes;
  if (!acao) return null;

  // O alvo pode conter `:` (um id composto, por exemplo); só os dois primeiros
  // campos são posicionais.
  return { acao, loja, alvo: resto.join(':') };
}

/* ---------------------------------------------------------------- */
/* Construtores                                                      */
/* ---------------------------------------------------------------- */

export function texto(corpo: string): MensagemDeSaida {
  return { tipo: 'texto', corpo };
}

export function imagem(url: string, corpo = ''): MensagemDeSaida | null {
  const link = url.trim();
  if (!/^https:\/\//i.test(link)) return null;
  return { tipo: 'imagem', url: link, corpo };
}

/**
 * Escolhe entre botão e lista pelo número de opções.
 *
 * O WhatsApp aceita no máximo 3 botões e 10 linhas de lista, e recusa a
 * mensagem inteira quando passa — sem dizer qual limite. Decidir aqui evita
 * espalhar essa contagem por cada passo da conversa.
 */
export function escolha(
  corpo: string,
  opcoes: Opcao[],
  rotuloDoBotao = 'Ver opções',
): MensagemDeSaida {
  if (opcoes.length <= 3) return { tipo: 'botoes', corpo, opcoes };
  return { tipo: 'lista', corpo, rotuloDoBotao, opcoes: opcoes.slice(0, 10) };
}

/**
 * Sempre lista, mesmo com 3 opções.
 *
 * Cardápio precisa da segunda linha (o preço). Botão do WhatsApp só tem
 * título — "Açaí" sem "a partir de R$ 13,00" é o que fez o cliente escolher
 * no escuro na conversa real.
 */
export function lista(
  corpo: string,
  opcoes: Opcao[],
  rotuloDoBotao = 'Ver opções',
): MensagemDeSaida {
  return { tipo: 'lista', corpo, rotuloDoBotao, opcoes: opcoes.slice(0, 10) };
}

/**
 * O carimbo que abre toda mensagem do bot.
 *
 * Com número compartilhado, dois pedidos de duas lojas caem na MESMA conversa
 * do cliente. Sem dizer de quem é cada mensagem, ele lê "seu pedido saiu para
 * entrega" e não sabe se é a pizza ou o hambúrguer. Não é enfeite: é o que
 * torna o modelo de número único utilizável.
 */
export function carimbo(loja: string, pedido?: string | null): string {
  return pedido ? `*${loja}* · Pedido #${pedido}` : `*${loja}*`;
}

/**
 * Preço para o cliente ler.
 *
 * Centavos são o que o domínio guarda; "R$ 13,00" é o que cabe numa linha de
 * opção. Ponto vira vírgula de propósito — é o jeito brasileiro, e é o que o
 * modelo precisa copiar para não responder "R$ 13.00".
 */
export function precoEmReais(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}
