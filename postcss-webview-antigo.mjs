/*
 * O CSS precisa entrar num WebView de 2020.
 *
 * O tablet do piloto (Galaxy Tab A, Android 11) tem WebView Chromium 87, e o
 * Play não atualiza o dele. O Tailwind 4 declara suporte a partir do Chrome
 * 111, e a folha que ele gera vem toda dentro de `@layer theme{...}`,
 * `@layer base{...}`, `@layer utilities{...}`. At-rule desconhecida é pulada
 * inteira — então não é "uma cor errada": some a folha completa e a página
 * aparece como HTML cru, com o SVG da marca ocupando a tela.
 *
 * Aqui só está o que mata a folha ou apaga layout inteiro. Cor ficou de fora
 * de propósito: o lightningcss que o próprio Tailwind roda já emite hex antes
 * de `lab()` e embrulha todo `color-mix` num `@supports` com a cor sólida do
 * lado de fora.
 */

const DINAMICAS = /(\d*\.?\d+)(dvh|svh|lvh|dvw|svw|lvw)\b/g;
const COMBINADORES = /[\s>+~]/;
const SOLTAS = ['translate', 'rotate', 'scale'];

const plugin = () => ({
  postcssPlugin: 'levo-webview-antigo',

  OnceExit(root, { list, AtRule }) {
    /*
     * 1. Camadas (Chrome 99). A ordem do arquivo já é a ordem das camadas —
     *    properties, theme, base, components, utilities — e utilitário é
     *    classe enquanto base é seletor de elemento, então tirar o embrulho
     *    mantém a cascata decidindo igual.
     */
    const camadas = [];
    root.walkAtRules('layer', (regra) => camadas.push(regra));
    for (const regra of camadas) {
      // `@layer a, b, c;` só declara ordem: sem filhos, não há o que salvar.
      if (regra.nodes) regra.replaceWith(regra.nodes);
      else regra.remove();
    }

    /*
     * 2. `:where()` (Chrome 88). Seletor com pseudo-classe desconhecida é
     *    descartado inteiro, e é nele que moram `space-y-*` e `divide-y` — o
     *    espaço entre as paradas da rota do motoboy.
     */
    root.walkRules((regra) => {
      const novo = list.comma(regra.selector).map(desembrulharWhere).join(', ');
      if (novo !== regra.selector) regra.selector = novo;
    });

    /*
     * 3. `translate`, `rotate` e `scale` soltos (Chrome 104). É com eles que o
     *    Tailwind centraliza diálogo e vira seta; sem eles o diálogo abre com
     *    o canto no meio da tela, metade para fora.
     *
     *    A cópia vai dentro de `@supports not (translate:0)` porque as duas
     *    formas SOMAM: navegador novo que lesse `transform` e `translate`
     *    deslocaria duas vezes.
     */
    root.walkRules((regra) => {
      const funcoes = [];
      for (const nome of SOLTAS) {
        const decl = ultimaDecl(regra, nome);
        const funcao = decl && comoFuncao(nome, decl.value);
        if (funcao) funcoes.push(funcao);
      }
      if (!funcoes.length) return;

      const copia = regra.clone();
      copia.removeAll();
      copia.append({ prop: 'transform', value: funcoes.join(' ') });

      const suporte = new AtRule({ name: 'supports', params: 'not (translate:0)' });
      suporte.append(copia);
      regra.after(suporte);
    });

    /*
     * 4. `dvh` (Chrome 108). Tela de altura inteira que vira zero deixa a rota
     *    do motoboy sem nada visível.
     *
     *    A cópia em `vh` vai em `@supports`, e não como declaração repetida
     *    antes da outra: o minificador do Next é lightningcss, e ele apaga
     *    declaração sobrescrita da mesma propriedade — o fallback sumia entre
     *    o `npm run build` e o arquivo servido.
     */
    root.walkRules((regra) => {
      const antigas = [];
      regra.each((no) => {
        if (no.type !== 'decl') return;
        DINAMICAS.lastIndex = 0;
        if (!DINAMICAS.test(no.value)) return;
        antigas.push({ prop: no.prop, value: no.value.replace(DINAMICAS, (_, n, u) => `${n}${u.slice(1)}`) });
      });
      if (!antigas.length) return;

      const copia = regra.clone();
      copia.removeAll();
      for (const decl of antigas) copia.append(decl);

      const suporte = new AtRule({ name: 'supports', params: 'not (height:1dvh)' });
      suporte.append(copia);
      regra.after(suporte);
    });
  },
});

/**
 * Tira o `:where()` quando dá para tirar sem mudar o que o seletor casa.
 *
 * Dois casos, e só eles:
 *
 *  - o seletor inteiro é `:where(X)` — vira `X`, que é a forma do `space-y-*`;
 *  - o conteúdo não tem combinador nem vírgula — `abbr:where([title])` vira
 *    `abbr[title]`.
 *
 * Fora disso o desembrulho mudaria o alvo: `.a:is(.b .c)` não é `.a.b .c`, e
 * vírgula dentro do parêntese é uma lista que não cabe no lugar.
 *
 * O preço é especificidade: `:where()` vale zero, `[title]` vale um. Como o
 * que sai daqui é utilitário do Tailwind, usado sozinho, ninguém depende
 * daquele zero — e o WebView novo lê exatamente a mesma regra.
 */
function desembrulharWhere(seletor) {
  let atual = seletor;

  for (;;) {
    const inicio = atual.indexOf(':where(');
    if (inicio < 0) return atual;

    const abre = inicio + ':where('.length;
    const fecha = fecharParentese(atual, abre);
    if (fecha < 0) return atual;

    const dentro = atual.slice(abre, fecha);
    const seletorTodo = inicio === 0 && fecha === atual.length - 1;
    const cru = foraDeGrupos(dentro);
    const simples = !cru.includes(',') && !COMBINADORES.test(cru);

    if (!seletorTodo && !simples) return atual;
    atual = atual.slice(0, inicio) + dentro + atual.slice(fecha + 1);
  }
}

/** A última declaração `nome` da regra — é ela que vale. */
function ultimaDecl(regra, nome) {
  let achada = null;
  regra.each((no) => {
    if (no.type === 'decl' && no.prop === nome) achada = no;
  });
  return achada;
}

/**
 * `translate: a b` vira `translate(a, b)`.
 *
 * Só as formas que o Tailwind emite. Qualquer outra — eixo nomeado em
 * `rotate: x 45deg`, um quarto valor — volta nulo, e a regra fica só com a
 * propriedade nova: melhor sem o atalho do que deslocando errado.
 */
function comoFuncao(nome, valor) {
  const partes = separarNoTopo(valor);
  if (!partes.length || partes.length > 3) return null;

  if (nome === 'rotate') return partes.length === 1 ? `rotate(${partes[0]})` : null;
  if (nome === 'scale') return partes.length <= 2 ? `scale(${partes.join(', ')})` : null;
  if (partes.length === 3) return `translate3d(${partes.join(', ')})`;
  return `translate(${partes.join(', ')})`;
}

function fecharParentese(texto, depoisDoAbre) {
  let nivel = 1;
  for (let i = depoisDoAbre; i < texto.length; i += 1) {
    if (texto[i] === '(') nivel += 1;
    else if (texto[i] === ')') {
      nivel -= 1;
      if (nivel === 0) return i;
    }
  }
  return -1;
}

/** O texto com o conteúdo de `()` e `[]` trocado por vazio. */
function foraDeGrupos(texto) {
  let fora = '';
  let nivel = 0;
  for (const c of texto) {
    if (c === '(' || c === '[') nivel += 1;
    else if (c === ')' || c === ']') nivel -= 1;
    else if (nivel === 0) fora += c;
  }
  return fora;
}

/** Quebra por espaço, sem cortar dentro de `var(...)` nem de `calc(...)`. */
function separarNoTopo(valor) {
  const partes = [];
  let atual = '';
  let nivel = 0;

  for (const c of valor.trim()) {
    if (c === '(') nivel += 1;
    else if (c === ')') nivel -= 1;

    if (nivel === 0 && /\s/.test(c)) {
      if (atual) partes.push(atual);
      atual = '';
      continue;
    }
    atual += c;
  }
  if (atual) partes.push(atual);

  return partes;
}

plugin.postcss = true;

export default plugin;
