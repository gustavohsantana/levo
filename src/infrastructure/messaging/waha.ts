import { ExternalServiceError } from '@/core';

/**
 * Cliente da WAHA (https://waha.devlike.pro).
 *
 * A WAHA é uma ponte para o WhatsApp Web: um número real é pareado por QR e
 * passa a enviar pela API. Não é canal oficial do Meta — o número pode ser
 * banido —, e é por isso que o envio automático é opt-in e que o ritmo abaixo
 * existe.
 *
 * O Levô usa uma chamada só. Não há webhook, não há conversa: o motoboy recebe
 * um link e abre.
 */
export interface WahaConfig {
  baseUrl: string;
  apiKey: string;
  session: string;
}

export class WahaSender {
  private proximoEnvio = 0;

  constructor(private readonly config: WahaConfig) {}

  /**
   * Espaça os envios com intervalo irregular.
   *
   * Número que dispara em rajada e em ritmo mecânico é o padrão que o WhatsApp
   * usa para identificar automação e banir. Isto veio pronto do assistente da
   * clínica, onde a lição já foi paga — e vale mais que qualquer documentação,
   * porque não está escrito em lugar nenhum.
   *
   * Cabe aqui, e não no worker, porque quem conhece o risco é quem fala com o
   * WhatsApp. Quem chama não deveria precisar saber disso para acertar.
   */
  private async respira(): Promise<void> {
    const espera = this.proximoEnvio - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    this.proximoEnvio = Date.now() + 1200 + Math.random() * 1600;
  }

  /** O PNG do QR em base64, ou nulo quando a sessão não está pedindo QR. */
  async qrBase64(): Promise<string | null> {
    const r = await fetch(
      `${this.config.baseUrl.replace(/\/$/, '')}/api/${this.config.session}/auth/qr?format=image`,
      { headers: { 'X-Api-Key': this.config.apiKey } },
    );
    if (!r.ok) return null;

    const bytes = Buffer.from(await r.arrayBuffer());
    return bytes.toString('base64');
  }

  /** Quem está pareado, para a tela dizer qual número é. */
  async connectedAs(): Promise<string | null> {
    const r = await fetch(
      `${this.config.baseUrl.replace(/\/$/, '')}/api/sessions/${this.config.session}`,
      { headers: { 'X-Api-Key': this.config.apiKey } },
    );
    if (!r.ok) return null;

    const corpo = (await r.json().catch(() => ({}))) as { me?: { id?: string } };
    return corpo.me?.id?.split('@')[0] ?? null;
  }

  async startSession(): Promise<void> {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json', 'X-Api-Key': this.config.apiKey };

    /*
     * Sessão em FAILED guarda credenciais mortas e fica tentando logar com elas
     * em vez de mostrar o QR — a tela não sai do lugar e nada explica por quê.
     * O logout descarta essas credenciais para a sessão poder pedir QR de novo.
     *
     * Isto veio do assistente da clínica, onde o problema já custou o tempo de
     * alguém. Acontece quando o número é aberto em outro WhatsApp Web, ou quando
     * o QR expira sem ninguém ler.
     */
    if ((await this.sessionStatus()) === 'FAILED') {
      await fetch(`${base}/api/sessions/${this.config.session}/logout`, { method: 'POST', headers });
      await new Promise((r) => setTimeout(r, 3000));
    }

    const criar = await fetch(`${base}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: this.config.session, start: true }),
    });

    // 422 é "já existe": reiniciar é o que faz ela pedir QR de novo.
    if (criar.status === 422) {
      await fetch(`${base}/api/sessions/${this.config.session}/restart`, {
        method: 'POST',
        headers,
      });
    }
  }

  async sendText(phone: string, text: string): Promise<void> {
    await this.respira();

    const resposta = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.config.apiKey,
      },
      body: JSON.stringify({
        session: this.config.session,
        chatId: `${phone}@c.us`,
        text,
      }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '');
      throw new ExternalServiceError('WAHA', corpo.slice(0, 300) || `HTTP ${resposta.status}`, {
        status: resposta.status,
      });
    }
  }

  /**
   * A sessão está pareada?
   *
   * `WORKING` é o único estado em que dá para enviar. Qualquer outro significa que
   * alguém precisa ler o QR de novo — e é melhor o worker dizer isso no log do
   * que empilhar falha silenciosa.
   */
  async sessionStatus(): Promise<string> {
    const r = await fetch(
      `${this.config.baseUrl.replace(/\/$/, '')}/api/sessions/${this.config.session}`,
      { headers: { 'X-Api-Key': this.config.apiKey } },
    );
    if (r.status === 404) return 'NOT_CREATED';
    if (!r.ok) return `HTTP_${r.status}`;

    const corpo = (await r.json().catch(() => ({}))) as { status?: string };
    return corpo.status ?? 'DESCONHECIDO';
  }
}
