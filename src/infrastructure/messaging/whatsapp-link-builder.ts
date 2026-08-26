import type { Order } from '@/core';

/**
 * Monta o link de conversa do WhatsApp já com a mensagem escrita.
 *
 * Usa o esquema público `wa.me`, que abre o aplicativo com o texto preenchido e
 * **não custa nada**. A alternativa oficial — WhatsApp Business API — exigiria
 * templates aprovados e cobrança por conversa, inviável num piloto gratuito.
 * O dono confere a mensagem e aperta enviar; um toque a mais, custo zero.
 */
export class WhatsAppLinkBuilder {
  constructor(private readonly publicBaseUrl: string) {}

  trackingUrl(order: Order): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/t/${order.trackingToken.value}`;
  }

  /**
   * Manda a rota para o motoboy no WhatsApp dele.
   *
   * Copiar o link e colar na conversa é um passo que se perde na correria — e
   * o link errado, colado na conversa errada, entrega a rota de um motoboy a
   * outro. Abrir a conversa certa com o texto pronto tira as duas chances de
   * erro.
   */
  routeLink(input: {
    accessToken: string;
    courierWhatsapp: string | null;
    courierName: string;
    stops: number;
  }): string | null {
    if (!input.courierWhatsapp) return null;

    const url = `${this.publicBaseUrl.replace(/\/$/, '')}/m/${input.accessToken}`;
    const paradas = input.stops === 1 ? '1 pedido' : `${input.stops} pedidos`;

    const message = [
      `Oi, ${firstName(input.courierName)}!`,
      '',
      `Sua rota com ${paradas} está pronta 🛵`,
      url,
    ].join('\n');

    return `https://wa.me/${input.courierWhatsapp}?text=${encodeURIComponent(message)}`;
  }

  /** `null` quando o pedido não tem telefone válido — a tela esconde o botão. */
  dispatchLink(order: Order, establishmentName: string): string | null {
    if (!order.customerPhone) return null;

    const message = [
      `Oi, ${firstName(order.customerName)}! Aqui é do ${establishmentName}.`,
      '',
      'Seu pedido saiu para entrega 🛵',
      `Acompanhe o entregador em tempo real: ${this.trackingUrl(order)}`,
    ].join('\n');

    return `https://wa.me/${order.customerPhone.whatsapp}?text=${encodeURIComponent(message)}`;
  }
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
