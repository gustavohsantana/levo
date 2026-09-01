/**
 * Formatação para leitura de relance.
 *
 * "18 min" é lido num piscar; "1080 segundos" exige conta. Numa tela que o dono
 * consulta no meio do atendimento, isso é a diferença entre usar e ignorar.
 */

export function minutes(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function distance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

export function currency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Fuso da operação, fixo.
 *
 * Sem ele, o horário sai diferente no servidor e no navegador: a Vercel roda em
 * UTC e o dono está em UTC-3. O React acusa isso como divergência de hidratação
 * (erro #418), e o efeito visível é pior que o aviso no console — o pedido das
 * 18:42 aparece como 21:42 no primeiro render, num painel em que a hora do
 * pedido é justamente o que diz se a entrega está atrasada.
 *
 * Fixar em São Paulo, e não no fuso do navegador, é o que faz dono, motoboy e
 * cliente verem o mesmo horário. Um estabelecimento em outro fuso (Acre,
 * Fernando de Noronha) exigiria guardar o fuso junto do estabelecimento — o
 * gatilho para isso é o primeiro cliente fora do horário de Brasília.
 */
const FUSO = 'America/Sao_Paulo';

export function clockTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  });
}

/** "há 3 min" — para o dono saber se a posição do motoboy está fresca. */
export function timeAgo(date: Date | string): string {
  const elapsed = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (elapsed < 45) return 'agora';
  if (elapsed < 3600) return `há ${Math.round(elapsed / 60)} min`;
  return `há ${Math.round(elapsed / 3600)} h`;
}

export function phoneDisplay(digits: string): string {
  /*
   * Número de serviço — 0800, 0300, 4004 — não tem DDD.
   *
   * Sem isto, o 0800 700 3020 que o iFood manda como contato do cliente vira
   * "(08) 00700-3020": a função assumia que os dois primeiros dígitos são
   * sempre DDD. Um número que ninguém consegue discar, na tela que existe
   * justamente para ligar para o cliente.
   */
  if (digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`.trim();
  }

  // Fora do formato brasileiro conhecido, devolve como veio: inventar máscara
  // sobre número estrangeiro ou truncado esconde mais do que ajuda.
  if (digits.length !== 10 && digits.length !== 11) return digits;

  const rest = digits.slice(2);
  const split = digits.length === 11 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
