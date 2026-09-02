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

  async sendText(chatId: string, text: string): Promise<void> {
    const resposta = await fetch(this.url('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // O link vira prévia gigante e empurra o texto para fora da tela.
        disable_web_page_preview: true,
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
        allowed_updates: ['message'],
      }),
    });
    return r.ok;
  }
}
