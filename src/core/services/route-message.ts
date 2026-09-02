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

export function mensagemDaRota(input: RouteMessageInput & { comBotao?: boolean }): string {
  const entregas = input.stops === 1 ? '1 entrega' : `${input.stops} entregas`;

  /*
   * Com botão, o link sai do corpo: repetido embaixo do botão que faz a mesma
   * coisa, ele só ocupa a tela e dá ao motoboy duas maneiras de acertar o mesmo
   * alvo — uma delas pior.
   */
  if (input.comBotao) {
    return [
      `Oi, ${primeiroNome(input.courierName)}! Sua rota da ${input.storeName} está pronta.`,
      '',
      `${entregas}. Toque abaixo para ver o caminho e confirmar cada uma.`,
    ].join('\n');
  }

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

/**
 * O pedido de localização ao vivo, mandado junto com a rota.
 *
 * O bot não consegue ligar isso sozinho — e não deveria. Compartilhar onde se
 * está é decisão de quem está lá, e o caminho passa pelo menu do Telegram de
 * propósito.
 *
 * Por isso o texto é um passo a passo curto: quem lê está de capacete, com a
 * moto ligada, e não vai caçar num menu que nunca usou.
 */
export function pedidoDeLocalizacao(): string {
  return [
    'Para a loja acompanhar a moto no mapa durante o turno:',
    '',
    '📎 (clipe) → Localização → Compartilhar localização ao vivo → 8 horas',
    '',
    'Funciona com o celular no bolso e a tela apagada, e para sozinho no fim.',
    'Se preferir mandar só a posição de agora, use o botão abaixo.',
  ].join('\n');
}

/**
 * O aviso de que o compartilhamento está para acabar.
 *
 * O prazo é escolhido por ele e ninguém pode estender — nem o bot. Sem este
 * aviso, o rastreio morre no meio do turno e o dono só descobre olhando um mapa
 * onde a moto parou de andar, sem saber se é trânsito ou fim de prazo.
 */
export function localizacaoExpirando(): string {
  return [
    'Seu compartilhamento de localização está acabando.',
    '',
    'Se ainda estiver rodando, renove: 📎 → Localização → ao vivo.',
  ].join('\n');
}
