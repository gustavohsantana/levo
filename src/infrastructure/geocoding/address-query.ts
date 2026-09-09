/**
 * Traduz um endereço escrito por gente para algo que o mapa entende.
 *
 * O Nominatim é literal: "Av Antonio Scodeller, 1296, Faisqueira, Pouso Alegre"
 * não existe para ele, mas "Avenida Antônio Scodeller, 1296, Pouso Alegre, MG,
 * Brasil" existe — mesma rua. Três coisas derrubam a busca:
 *
 *  • **abreviação** — "Av" precisa virar "Avenida";
 *  • **falta de cidade, estado e país** — sem isso ele procura no mundo todo;
 *  • **bairro** que o OSM não mapeou — a presença dele zera o resultado.
 *
 * Por isso a busca não é uma consulta, e sim uma sequência: da mais específica
 * para a mais tolerante. A primeira que responder vence. Endereço brasileiro é
 * escrito de dez jeitos, e insistir num só é desistir do pedido.
 */
const ABREVIACOES: Array<[RegExp, string]> = [
  [/\bav\.?\b/gi, 'Avenida'],
  [/\bavd\.?\b/gi, 'Avenida'],
  [/\br\.?\b(?=\s)/gi, 'Rua'],
  [/\brod\.?\b/gi, 'Rodovia'],
  [/\bpç\.?a?\b/gi, 'Praça'],
  [/\bpc\.?a?\b(?=\s)/gi, 'Praça'],
  [/\btrav\.?\b/gi, 'Travessa'],
  [/\bal\.?\b(?=\s)/gi, 'Alameda'],
  [/\best\.?\b(?=\s)/gi, 'Estrada'],
  [/\blgo\.?\b/gi, 'Largo'],
  [/\bpq\.?\b/gi, 'Parque',],
  [/\bjd\.?\b/gi, 'Jardim'],
  [/\bstr?\.?\b(?=\s)/gi, 'Santa'],
  [/\bs[ãa]o\b/gi, 'São'],
  [/\bn[º°]\s*/gi, ''],
  [/\bnº?\.?\s*(?=\d)/gi, ''],
];

export interface Regiao {
  city?: string | null;
  state?: string | null;
}

/**
 * As tentativas, em ordem. Sem repetições e sem vazios.
 */
export function candidatosDeBusca(endereco: string, regiao: Regiao = {}): string[] {
  const sufixo = [regiao.city, regiao.state, 'Brasil'].filter(Boolean).join(', ');

  /*
   * A cidade é removida do texto e recolocada no fim, sempre.
   *
   * Recortar partes do endereço pode levar junto a cidade que o dono escreveu —
   * e uma busca sem cidade casa com rua homônima em outro estado, devolvendo
   * coordenada válida no lugar errado. Normalizar aqui garante que toda
   * tentativa carregue a região.
   */
  /*
   * Vírgula **e** hífen separam. "Rua X, 320 - Centro" é escrita corrente no
   * Brasil, e tratar o hífen como parte do texto grudava número e bairro numa
   * coisa só — o que impedia justamente a tentativa sem bairro, que é a que
   * mais salva.
   */
  const partes = expandir(endereco)
    .replace(/\s+-\s+/g, ',')
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .filter((parte) => !ehRegiao(parte, regiao));

  const com = (usadas: string[]) =>
    [usadas.join(', '), sufixo].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();

  const tentativas = [com(partes)];

  /*
   * Sem o bairro. É o que mais salva: "Faisqueira" não existe no OSM de Pouso
   * Alegre, e a simples presença dela zera a busca de uma avenida que existe.
   */
  if (partes.length >= 3) tentativas.push(com(partes.slice(0, 2)));

  // Só a rua. Cai no meio da via — impreciso, mas o motoboy acha, e é
  // infinitamente melhor que pedido sem pino nenhum.
  if (partes.length >= 2) tentativas.push(com([partes[0]]));

  return [...new Set(tentativas)].filter(Boolean);
}

/** A cidade ou o estado escritos pelo dono, em qualquer caixa. */
function ehRegiao(parte: string, regiao: Regiao): boolean {
  const alvo = parte.toLocaleLowerCase();

  return [regiao.city, regiao.state, 'brasil', 'brazil']
    .filter(Boolean)
    .some((valor) => alvo === String(valor).toLocaleLowerCase());
}

function expandir(texto: string): string {
  return ABREVIACOES.reduce(
    (atual, [padrao, substituto]) => atual.replace(padrao, substituto),
    texto,
  );
}

/**
 * O caminho inverso: separa rua, número e bairro do endereço montado.
 *
 * `montarEndereco` produz "Rua X, 123 - Bairro Y, Cidade". O geocodificador do
 * IBGE precisa das partes de volta — a rua e o bairro para achar, o número para
 * interpolar. Best-effort: o que não der para separar volta vazio, e quem chama
 * decide (o geocodificador cai na cascata se faltar rua).
 */
export function partesDoEndereco(raw: string): {
  rua: string;
  numero: number;
  bairro: string;
} {
  const [via = '', local = ''] = raw.split(' - ');

  // "Rua X, 123" → o número é o último trecho, se for número.
  const pedacosVia = via.split(',').map((p) => p.trim());
  const ultimo = pedacosVia[pedacosVia.length - 1] ?? '';
  const temNumero = /^\d+/.test(ultimo);
  const numero = temNumero ? parseInt(ultimo, 10) || 0 : 0;
  const rua = (temNumero ? pedacosVia.slice(0, -1) : pedacosVia).join(', ').trim();

  // "Bairro Y, Cidade" → o bairro é o primeiro trecho.
  const bairro = (local.split(',')[0] ?? '').trim();

  return { rua, numero, bairro };
}
