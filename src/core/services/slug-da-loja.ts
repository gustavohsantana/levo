/**
 * O endereço público da loja: `levoentregas.vercel.app/cardapio/pizzaria-do-ze`.
 *
 * É o que o dono manda no WhatsApp e imprime no cartão, então precisa sair legível
 * do nome que ele digitou e nunca mudar depois. Um slug que muda quebra todo link
 * já compartilhado — e o dono descobre isso pelo cliente que não conseguiu pedir.
 */

/**
 * Reservado porque colide com rota do próprio site, ou porque um dia vai colidir.
 *
 * `cardapio/login` seria uma loja chamada "Login"; `cardapio/api` confunde quem lê
 * o log. Barato reservar agora, caro descobrir depois que o slug de um cliente
 * ficou inacessível.
 */
const RESERVADOS = new Set([
  'admin',
  'api',
  'app',
  'cadastro',
  'cardapio',
  'configuracoes',
  'cozinha',
  'dashboard',
  'entrar',
  'levo',
  'login',
  'logout',
  'm',
  'mapa',
  'pedido',
  'pagamento',
  'privacidade',
  'sobre',
  't',
  'termos',
]);

const TAMANHO_MAXIMO = 40;

/**
 * Transforma o nome da loja num slug.
 *
 * Sem acento, sem cedilha e sem "&": o slug vive numa URL que vai ser copiada,
 * colada e digitada à mão. Tudo que exige teclado especial vira atrito na mão de
 * quem só quer pedir uma pizza.
 */
export function slugDoNome(nome: string): string {
  const base = nome
    .normalize('NFD')
    // Tira os acentos separados pelo NFD, preservando a letra de base.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, TAMANHO_MAXIMO)
    // O corte pode deixar um hífen solto no fim.
    .replace(/-+$/g, '');

  return base;
}

/**
 * O slug definitivo, desviando do que já existe.
 *
 * `existe` responde se um candidato já está tomado — quem pergunta ao banco é
 * quem chama, para esta função continuar pura e testável.
 *
 * A numeração começa em 2 porque "pizzaria-do-ze-2" lê como a segunda Pizzaria do
 * Zé, que é exatamente o que é. Um sufixo aleatório seria mais fácil de escrever e
 * pior de ler em voz alta no telefone.
 */
export async function slugDisponivel(
  nome: string,
  existe: (candidato: string) => Promise<boolean>,
): Promise<string> {
  const base = slugDoNome(nome);

  /*
   * Nome que vira slug vazio — só emoji, só pontuação, ou um alfabeto que o
   * normalizador não converte. Raro, mas cair aqui com string vazia geraria a
   * URL `/cardapio/` , que não é de loja nenhuma.
   */
  const inicial = base.length >= 2 ? base : 'loja';

  for (let n = 1; n < 100; n++) {
    const candidato = n === 1 ? inicial : `${inicial}-${n}`;
    if (RESERVADOS.has(candidato)) continue;
    if (!(await existe(candidato))) return candidato;
  }

  /*
   * Cem lojas com o mesmo nome é improvável o bastante para não valer código
   * bonito, mas provável o bastante para não valer um erro na cara do cliente
   * no meio do cadastro.
   */
  return `${inicial}-${Date.now().toString(36)}`;
}
