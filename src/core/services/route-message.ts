/**
 * A mensagem que o motoboy recebe no WhatsApp.
 *
 * Ela é lida numa moto parada no semáforo, com capacete, em tela pequena. Então
 * o que importa vem antes: quantas entregas e o link. O resto é ruído.
 */
export interface RouteMessageInput {
  courierName: string;
  storeName: string;
  stops: number;
  link: string;
}

/** Só o primeiro nome: "Oi, Jefferson" é como se fala com alguém. */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome.trim();
}

export function mensagemDaRota(input: RouteMessageInput): string {
  const entregas = input.stops === 1 ? '1 entrega' : `${input.stops} entregas`;

  /*
   * Sem emoji e sem saudação longa de propósito. Mensagem automática que imita
   * conversa humana envelhece mal — o motoboy recebe a mesma todo dia, e o que
   * ele quer é o número e o link.
   */
  return [
    `Oi, ${primeiroNome(input.courierName)}! Sua rota da ${input.storeName} está pronta.`,
    '',
    `${entregas}. Abra para ver o caminho e confirmar cada uma:`,
    input.link,
  ].join('\n');
}

/**
 * O telefone no formato que o WhatsApp entende: só dígitos, com DDI.
 *
 * O dono cadastra "(35) 99999-1234" porque é assim que ele lê. O 55 entra
 * quando falta — número brasileiro sem DDI vira um chat que não existe, e a
 * mensagem some sem erro nenhum, que é o pior tipo de falha.
 */
export function telefoneParaWhatsApp(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, '');
  if (digitos.length < 10) return null;

  if (digitos.startsWith('55')) {
    // 55 + DDD(2) + numero(8 ou 9)
    return digitos.length === 12 || digitos.length === 13 ? digitos : null;
  }

  return digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : null;
}
