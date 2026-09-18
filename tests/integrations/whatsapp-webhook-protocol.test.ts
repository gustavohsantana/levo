import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  assinaturaConfere,
  mensagensDoEvento,
  verificarInscricao,
} from '@/infrastructure/integrations/whatsapp/webhook-protocol';

/**
 * O protocolo do webhook da Cloud API.
 *
 * Os três riscos aqui falham calados, que é o que os torna caros: o aperto de
 * mão recusado sem mensagem de erro, a assinatura que passa a nunca bater
 * depois de um parse, e o menu do bot chegando vazio porque botão não manda
 * `text`.
 */

const SEGREDO = 'app-secret-de-teste';
const TOKEN = 'token-que-nos-escolhemos';

function assinar(corpo: string): string {
  return `sha256=${createHmac('sha256', SEGREDO).update(corpo, 'utf8').digest('hex')}`;
}

describe('aperto de mão da inscrição', () => {
  it('devolve o desafio quando o token confere', () => {
    const r = verificarInscricao(
      new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': TOKEN,
        'hub.challenge': '1158201444',
      }),
      TOKEN,
    );

    expect(r).toEqual({ ok: true, desafio: '1158201444' });
  });

  it('recusa token errado', () => {
    const r = verificarInscricao(
      new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'chute',
        'hub.challenge': '123',
      }),
      TOKEN,
    );

    expect(r.ok).toBe(false);
  });

  it('recusa quando falta o desafio ou o modo não é subscribe', () => {
    const semDesafio = verificarInscricao(
      new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': TOKEN }),
      TOKEN,
    );
    const modoErrado = verificarInscricao(
      new URLSearchParams({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': TOKEN,
        'hub.challenge': '123',
      }),
      TOKEN,
    );

    expect(semDesafio.ok).toBe(false);
    expect(modoErrado.ok).toBe(false);
  });
});

describe('assinatura do corpo', () => {
  const corpo = '{"object":"whatsapp_business_account","entry":[]}';

  it('aceita a assinatura da Meta, com o prefixo sha256=', () => {
    expect(assinaturaConfere(corpo, assinar(corpo), SEGREDO)).toBe(true);
  });

  it('recusa corpo adulterado por um único byte', () => {
    const assinatura = assinar(corpo);
    expect(assinaturaConfere(`${corpo} `, assinatura, SEGREDO)).toBe(false);
  });

  it('recusa assinatura ausente ou de outro segredo', () => {
    const deOutro = `sha256=${createHmac('sha256', 'outro').update(corpo).digest('hex')}`;

    expect(assinaturaConfere(corpo, null, SEGREDO)).toBe(false);
    expect(assinaturaConfere(corpo, deOutro, SEGREDO)).toBe(false);
  });
});

describe('mensagens dentro do envelope', () => {
  function envelope(messages: unknown[], contacts: unknown[] = []) {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '102290129340398',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '106540352242922' },
                contacts,
                messages,
              },
            },
          ],
        },
      ],
    };
  }

  it('achata os quatro níveis e traz o nome do contato', () => {
    const [msg] = mensagensDoEvento(
      envelope(
        [
          {
            id: 'wamid.ABC',
            from: '553599887766',
            timestamp: '1758000000',
            type: 'text',
            text: { body: '  quero uma pizza  ' },
          },
        ],
        [{ wa_id: '553599887766', profile: { name: 'Maria Souza' } }],
      ),
    );

    expect(msg?.id).toBe('wamid.ABC');
    expect(msg?.de).toBe('553599887766');
    expect(msg?.nome).toBe('Maria Souza');
    expect(msg?.texto).toBe('quero uma pizza');
    expect(msg?.paraNumeroId).toBe('106540352242922');
    // O timestamp vem em SEGUNDOS: sem o ×1000 a mensagem cairia em 1970.
    expect(msg?.em.getTime()).toBe(1_758_000_000_000);
  });

  it('lê o rótulo de botão e de lista — é por aí que o menu do bot responde', () => {
    const msgs = mensagensDoEvento(
      envelope([
        {
          id: 'wamid.BTN',
          from: '5535988776655',
          type: 'interactive',
          interactive: { button_reply: { title: 'Ver cardápio' } },
        },
        {
          id: 'wamid.LST',
          from: '5535988776655',
          type: 'interactive',
          interactive: { list_reply: { title: 'Pizza Calabresa' } },
        },
      ]),
    );

    expect(msgs.map((m) => m.texto)).toEqual(['Ver cardápio', 'Pizza Calabresa']);
  });

  it('⭐ pin de localização vira texto, não chega nulo', () => {
    /*
     * Conversa real: o cliente mandou o pin e o payload chegou com texto
     * nulo. O agente improvisou em cima do vazio. O envelope da Meta traz
     * latitude/longitude — é isto que tem que sobreviver ao achatamento.
     */
    const [msg] = mensagensDoEvento(
      envelope([
        {
          id: 'wamid.PIN',
          from: '553591398956',
          type: 'location',
          location: {
            latitude: -22.229,
            longitude: -45.936,
            name: 'Residencial Santa Rita',
            address: 'Pouso Alegre, MG',
          },
        },
      ]),
    );

    expect(msg?.tipo).toBe('location');
    expect(msg?.texto).toContain('📍');
    expect(msg?.texto).toContain('-22.229');
    expect(msg?.texto).toContain('Residencial Santa Rita');
  });

  it('áudio chega com tipo e sem texto — o motor precisa disto, não do body', () => {
    const [msg] = mensagensDoEvento(
      envelope([{ id: 'wamid.AUD', from: '553591398956', type: 'audio' }]),
    );

    expect(msg?.tipo).toBe('audio');
    expect(msg?.texto).toBeNull();
  });

  it('ignora evento que não é mensagem em vez de tratar como falha', () => {
    /*
     * A mesma inscrição entrega recibo de entrega e mudança de status. Tratar
     * isso como erro faria a Meta reenviar para sempre um evento perfeito.
     */
    const statuses = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '106540352242922' },
                statuses: [{ id: 'wamid.X', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    };

    expect(mensagensDoEvento(statuses)).toEqual([]);
    expect(mensagensDoEvento({})).toEqual([]);
    expect(mensagensDoEvento(null)).toEqual([]);
  });

  it('descarta mensagem sem id ou sem remetente', () => {
    const msgs = mensagensDoEvento(
      envelope([{ from: '5535988776655', type: 'text' }, { id: 'wamid.SEM_FROM' }]),
    );

    expect(msgs).toEqual([]);
  });
});

describe('o id da opção tocada', () => {
  function envelopeCom(messages: unknown[]) {
    return {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: { metadata: { phone_number_id: '1' }, messages },
            },
          ],
        },
      ],
    };
  }

  it('traz o id do botão e da lista, além do rótulo', () => {
    /*
     * O `id` é NOSSO — nós o escolhemos ao montar a mensagem. É por ele que
     * viaja qual loja e qual pedido, e é o que torna a resposta inequívoca
     * mesmo que o cliente responda um botão antigo estando em outra conversa.
     */
    const msgs = mensagensDoEvento(
      envelopeCom([
        {
          id: 'wamid.B',
          from: '5535988776655',
          type: 'interactive',
          interactive: { button_reply: { id: 'conf:pizzariadoze:12', title: 'Confirmar' } },
        },
        {
          id: 'wamid.L',
          from: '5535988776655',
          type: 'interactive',
          interactive: { list_reply: { id: 'item:pizzariadoze:calabresa', title: 'Calabresa' } },
        },
      ]),
    );

    expect(msgs.map((m) => m.opcaoId)).toEqual([
      'conf:pizzariadoze:12',
      'item:pizzariadoze:calabresa',
    ]);
    expect(msgs.map((m) => m.texto)).toEqual(['Confirmar', 'Calabresa']);
  });

  it('mensagem digitada não tem opção', () => {
    const [msg] = mensagensDoEvento(
      envelopeCom([
        { id: 'wamid.T', from: '5535988776655', type: 'text', text: { body: 'oi' } },
      ]),
    );

    expect(msg?.opcaoId).toBeNull();
  });
});
