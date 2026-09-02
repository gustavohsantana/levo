import { ExternalServiceError } from '@/core';

/**
 * Bot do Telegram: o canal automático que não bane ninguém.
 *
 * A diferença que importa em relação ao WhatsApp não é técnica, é de regra: o
 * bot **não pode iniciar** conversa. O motoboy toca no convite uma vez e
 * autoriza. Por isso não existe mensagem indesejada, e por isso não existe
 * punição por enviar — o consentimento é a arquitetura, não uma promessa.
 *
 * Roda direto da Vercel: API pública, HTTPS, sem VM, sem container, sem QR.
 */
export class TelegramSender {
  constructor(private readonly botToken: string) {}

  private url(metodo: string): string {
    return `https://api.telegram.org/bot${this.botToken}/${metodo}`;
  }

  /**
   * Manda a mensagem, com a tela do motoboy num botão quando há link.
   *
   * O botão é um Mini App: abre a rota **dentro** do Telegram, em tela cheia,
   * em vez de jogar o motoboy para o navegador — onde ele perde a conversa de
   * vista e volta com dois toques. Numa moto isso conta.
   *
   * Só vale em conversa privada, que é exatamente o nosso caso: o bot só fala
   * com quem o convidou.
   */
  async sendText(chatId: string, text: string, link?: string | null): Promise<void> {
    const resposta = await fetch(this.url('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // O link vira prévia gigante e empurra o texto para fora da tela.
        disable_web_page_preview: true,
        ...(link
          ? {
              reply_markup: {
                inline_keyboard: [[{ text: '🛵 Abrir minha rota', web_app: { url: link } }]],
              },
            }
          : {}),
      }),
    });

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => ({}))) as { description?: string };
      throw new ExternalServiceError(
        'Telegram',
        corpo.description ?? `HTTP ${resposta.status}`,
        { status: resposta.status },
      );
    }
  }

  /**
   * Pede a posição com um botão de um toque.
   *
   * `request_location` devolve UMA posição, não o compartilhamento contínuo —
   * esse o bot não consegue ligar, e é bom que não consiga: uma API capaz de
   * ativar rastreamento remoto de alguém seria uma API de perseguição.
   *
   * Serve para o caso comum de "cadê ele agora": um toque, sem menu. O modo ao
   * vivo continua sendo escolha dele, pelo clipe.
   */
  async pedirPosicao(chatId: string, texto: string): Promise<void> {
    const resposta = await fetch(this.url('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        reply_markup: {
          keyboard: [[{ text: '📍 Enviar minha posição agora', request_location: true }]],
          resize_keyboard: true,
          // Some depois do toque: teclado fixo rouba metade da tela na moto.
          one_time_keyboard: true,
        },
      }),
    });

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => ({}))) as { description?: string };
      throw new ExternalServiceError('Telegram', corpo.description ?? `HTTP ${resposta.status}`, {
        status: resposta.status,
      });
    }
  }

  /** O nome do bot, para montar o link de convite sem alguém digitar errado. */
  async username(): Promise<string | null> {
    const r = await fetch(this.url('getMe'));
    if (!r.ok) return null;

    const corpo = (await r.json().catch(() => ({}))) as { result?: { username?: string } };
    return corpo.result?.username ?? null;
  }

  /**
   * Aponta o Telegram para o nosso webhook.
   *
   * Idempotente do lado deles: chamar de novo com a mesma URL não duplica nada.
   * O `secret_token` volta em todo webhook, e é o que distingue um evento real
   * de qualquer um que descubra o endereço — que é público por necessidade.
   */
  async setWebhook(url: string, secret: string): Promise<boolean> {
    const r = await fetch(this.url('setWebhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secret,
        /*
         * `edited_message` não é opcional aqui: a localização ao vivo chega
         * como edição da mensagem original, não como mensagem nova. Sem isto o
         * Telegram nem tenta entregar, e o rastreio simplesmente não existe.
         */
        allowed_updates: ['message', 'edited_message'],
      }),
    });
    return r.ok;
  }
}
