import { ExternalServiceError, type Logger } from '@/core';

/**
 * Envio de mensagem pela Cloud API do WhatsApp.
 *
 * O contrário do webhook: aqui nós falamos. Três coisas que a API deles impõe e
 * que mudam o desenho:
 *
 * 1. **A janela de atendimento.** Dentro de 24h da última mensagem do cliente,
 *    texto livre é permitido — e é de graça. Fora dela, só template aprovado, e
 *    aí custa. O bot de pedido vive inteiro dentro da janela.
 *
 * 2. **HTTP 200 não garante entrega.** A resposta diz que a Meta ACEITOU a
 *    mensagem; entrega e leitura chegam depois, por webhook.
 *
 * 3. **Erro de negócio vem com código próprio.** `131030` é destinatário fora
 *    da lista do número de teste, `131047` é janela expirada. Os dois têm
 *    tratamento diferente e não podem virar "falhou" genérico.
 */

const BASE_PADRAO = 'https://graph.facebook.com';

/** O que a Meta devolve quando aceita a mensagem. */
export interface MensagemEnviada {
  /** O `wamid` da mensagem que sai. Serve para casar com o recibo de entrega. */
  id: string;
  /** O telefone como a Meta o normalizou — pode diferir do que mandamos. */
  para: string;
}

export class WhatsappEnvio {
  private readonly baseUrl: string;
  private readonly versao: string;

  constructor(
    private readonly opts: {
      /** `phone_number_id` do número que FALA. Não é o número em si. */
      phoneNumberId: string;
      accessToken: string;
      logger?: Logger;
      baseUrl?: string;
      graphVersion?: string;
    },
  ) {
    this.baseUrl = (opts.baseUrl ?? BASE_PADRAO).replace(/\/$/, '');
    this.versao = opts.graphVersion ?? 'v23.0';
  }

  /** Texto livre. Só vale dentro da janela de 24h. */
  texto(para: string, corpo: string): Promise<MensagemEnviada> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: apenasDigitos(para),
      type: 'text',
      /*
       * `preview_url: false` de propósito. Link no corpo vira cartão de
       * pré-visualização, que empurra a conversa para cima no celular e some
       * com o que foi dito antes — ruim quando o que importa é o passo atual do
       * pedido.
       */
      text: { body: corpo, preview_url: false },
    });
  }

  /**
   * Até 3 botões de resposta.
   *
   * Medido em produção: o motor já montava botões, e o webhook achatava em
   * texto numerado. O cliente via "formatação zoada" e pedia menu pra clicar.
   * O título do WhatsApp trunca em 20 — cortar aqui evita a API recusar.
   */
  botoes(
    para: string,
    corpo: string,
    opcoes: { id: string; rotulo: string }[],
  ): Promise<MensagemEnviada> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: apenasDigitos(para),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: corpo },
        action: {
          buttons: opcoes.slice(0, 3).map((o) => ({
            type: 'reply',
            reply: { id: o.id.slice(0, 256), title: o.rotulo.slice(0, 20) },
          })),
        },
      },
    });
  }

  /**
   * Foto por link HTTPS. A lista do WhatsApp não aceita miniatura por linha,
   * então o menu manda a foto antes, quando o produto tem imagem.
   */
  imagem(para: string, url: string, caption?: string): Promise<MensagemEnviada> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: apenasDigitos(para),
      type: 'image',
      image: {
        link: url,
        ...(caption ? { caption: caption.slice(0, 1024) } : {}),
      },
    });
  }

  /**
   * Lista de até 10 linhas. O `rotuloDoBotao` é o que abre a lista.
   *
   * Categorias do cardápio cabem aqui; botão de resposta só aceita 3.
   */
  lista(
    para: string,
    corpo: string,
    rotuloDoBotao: string,
    opcoes: { id: string; rotulo: string; descricao?: string }[],
  ): Promise<MensagemEnviada> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: apenasDigitos(para),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: corpo },
        action: {
          button: rotuloDoBotao.slice(0, 20),
          sections: [
            {
              title: 'Opções',
              rows: opcoes.slice(0, 10).map((o) => ({
                id: o.id.slice(0, 200),
                title: o.rotulo.slice(0, 24),
                ...(o.descricao ? { description: o.descricao.slice(0, 72) } : {}),
              })),
            },
          ],
        },
      },
    });
  }

  /**
   * Marca a mensagem do cliente como lida (os dois tiques azuis).
   *
   * Não é enfeite: sem isso o cliente fica olhando para uma mensagem entregue e
   * não lida enquanto o bot pensa, e a sensação é de que ninguém viu.
   */
  async marcarComoLida(mensagemId: string): Promise<void> {
    await this.enviar({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: mensagemId,
    }).catch((cause) => {
      // Falhar aqui não pode derrubar a resposta — é cosmético perto de
      // responder ao cliente.
      this.opts.logger?.warn({ mensagemId, cause: String(cause) }, 'whatsapp.marcar_lida_falhou');
    });
  }

  private async enviar(corpo: Record<string, unknown>): Promise<MensagemEnviada> {
    const url = `${this.baseUrl}/${this.versao}/${this.opts.phoneNumberId}/messages`;

    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.opts.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    });

    const texto = await resposta.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(texto) as Record<string, unknown>;
    } catch {
      throw new ExternalServiceError('WhatsApp', `resposta ilegível (HTTP ${resposta.status})`);
    }

    const erro = json.error as { message?: string; code?: number; error_subcode?: number } | undefined;
    if (erro) {
      /*
       * O código entra na mensagem porque é o que distingue um problema de
       * configuração de um de operação — e os dois parecem iguais no log sem
       * ele. 131030: destinatário fora da lista do número de teste.
       * 131047: janela de 24h expirada, precisa de template.
       */
      this.opts.logger?.warn(
        { code: erro.code, subcode: erro.error_subcode, status: resposta.status },
        'whatsapp.envio_falhou',
      );
      throw new ExternalServiceError(
        'WhatsApp',
        `${erro.message ?? 'erro desconhecido'} (code ${erro.code ?? '?'})`,
        { code: erro.code, subcode: erro.error_subcode },
      );
    }

    if (!resposta.ok) {
      throw new ExternalServiceError('WhatsApp', `HTTP ${resposta.status}`);
    }

    const mensagens = json.messages as { id?: string }[] | undefined;
    const contatos = json.contacts as { wa_id?: string }[] | undefined;

    return {
      id: mensagens?.[0]?.id ?? '',
      para: contatos?.[0]?.wa_id ?? '',
    };
  }
}

/**
 * A Meta quer só dígitos, em E.164 sem o `+`.
 *
 * Um número colado da tela vem com parênteses, traço e espaço, e ela responde
 * um erro genérico que não menciona formatação.
 */
function apenasDigitos(numero: string): string {
  return numero.replace(/\D/g, '');
}
