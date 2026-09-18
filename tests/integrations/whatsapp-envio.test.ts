import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '@/core';
import { WhatsappEnvio } from '@/infrastructure/integrations/whatsapp/envio';

/**
 * O lado que fala.
 *
 * O risco aqui não é o caminho feliz — é confundir "a Meta aceitou" com "o
 * cliente recebeu", e tratar erro de configuração como erro de operação. Os
 * dois aparecem como HTTP 200 com `error` no corpo.
 */

const PID = '1280375845161357';

function envio() {
  return new WhatsappEnvio({ phoneNumberId: PID, accessToken: 'tok-123' });
}

function respondeCom(corpo: unknown, status = 200) {
  const mock = vi.fn(async () => new Response(JSON.stringify(corpo), { status }));
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => vi.unstubAllGlobals());

describe('envio de texto', () => {
  it('manda para o phone_number_id certo, com o token no header', async () => {
    const mock = respondeCom({
      contacts: [{ wa_id: '553591398956' }],
      messages: [{ id: 'wamid.SAIDA' }],
    });

    const r = await envio().texto('553591398956', 'Olá!');

    const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://graph.facebook.com/v23.0/${PID}/messages`);
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-123');
    expect(r).toEqual({ id: 'wamid.SAIDA', para: '553591398956' });
  });

  it('limpa a formatação do número — a Meta quer só dígitos', async () => {
    const mock = respondeCom({ contacts: [{ wa_id: '553591398956' }], messages: [{ id: 'x' }] });

    await envio().texto('+55 (35) 9139-8956', 'oi');

    const corpo = JSON.parse(((mock.mock.calls[0] as unknown as [string, RequestInit])[1]).body as string);
    expect(corpo.to).toBe('553591398956');
    expect(corpo.messaging_product).toBe('whatsapp');
  });

  it('não deixa o WhatsApp montar cartão de link', async () => {
    /*
     * Cartão de pré-visualização empurra a conversa para cima no celular e some
     * com o passo anterior do pedido — que é justamente o que o cliente precisa
     * ver enquanto responde.
     */
    const mock = respondeCom({ contacts: [{ wa_id: '1' }], messages: [{ id: 'x' }] });

    await envio().texto('553591398956', 'veja https://levo.app/cardapio');

    const corpo = JSON.parse(((mock.mock.calls[0] as unknown as [string, RequestInit])[1]).body as string);
    expect(corpo.text.preview_url).toBe(false);
  });
});

describe('envio interativo', () => {
  it('⭐ botões saem como interactive, não como texto numerado', async () => {
    /*
     * O motor já montava botões; o webhook achatava em "1. Açaí". O cliente
     * chamou de formatação zoada e pediu menu pra clicar.
     */
    const mock = respondeCom({ contacts: [{ wa_id: '1' }], messages: [{ id: 'x' }] });

    await envio().botoes('553591398956', 'O que você quer?', [
      { id: 'cat:ze:Acai', rotulo: 'Açaí' },
      { id: 'cat:ze:Pizzas', rotulo: 'Pizzas' },
    ]);

    const corpo = JSON.parse(((mock.mock.calls[0] as unknown as [string, RequestInit])[1]).body as string);
    expect(corpo.type).toBe('interactive');
    expect(corpo.interactive.type).toBe('button');
    expect(corpo.interactive.action.buttons).toHaveLength(2);
    expect(corpo.interactive.action.buttons[0].reply).toEqual({ id: 'cat:ze:Acai', title: 'Açaí' });
  });

  it('lista corta título em 24 e descrição em 72 — a API recusa acima', async () => {
    const mock = respondeCom({ contacts: [{ wa_id: '1' }], messages: [{ id: 'x' }] });
    const longo = 'A'.repeat(40);

    await envio().lista('553591398956', 'Escolha', 'Categorias', [
      { id: 'x', rotulo: longo, descricao: 'B'.repeat(90) },
    ]);

    const corpo = JSON.parse(((mock.mock.calls[0] as unknown as [string, RequestInit])[1]).body as string);
    expect(corpo.interactive.type).toBe('list');
    expect(corpo.interactive.action.button).toBe('Categorias');
    expect(corpo.interactive.action.sections[0].rows[0].title).toHaveLength(24);
    expect(corpo.interactive.action.sections[0].rows[0].description).toHaveLength(72);
  });
});

describe('erros que a Meta devolve com HTTP 200', () => {
  it('destinatário fora da lista do número de teste carrega o código 131030', async () => {
    respondeCom({
      error: { message: 'Recipient phone number not in allowed list', code: 131030 },
    });

    await expect(envio().texto('553599999999', 'oi')).rejects.toThrow(ExternalServiceError);
    await expect(envio().texto('553599999999', 'oi')).rejects.toThrow(/131030/);
  });

  it('janela de 24h expirada carrega o código 131047', async () => {
    // Distinguir este do anterior é o que separa "configure a lista" de "use
    // um template" — duas ações completamente diferentes.
    respondeCom({ error: { message: 'Re-engagement message', code: 131047 } });

    await expect(envio().texto('553591398956', 'oi')).rejects.toThrow(/131047/);
  });

  it('corpo ilegível não vira sucesso silencioso', async () => {
    const mock = vi.fn(async () => new Response('<html>502</html>', { status: 502 }));
    vi.stubGlobal('fetch', mock);

    await expect(envio().texto('553591398956', 'oi')).rejects.toThrow(ExternalServiceError);
  });
});

describe('marcar como lida', () => {
  it('manda status read com o id da mensagem do cliente', async () => {
    const mock = respondeCom({ success: true });

    await envio().marcarComoLida('wamid.ENTRADA');

    const corpo = JSON.parse(((mock.mock.calls[0] as unknown as [string, RequestInit])[1]).body as string);
    expect(corpo).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.ENTRADA',
    });
  });

  it('falhar ao marcar como lida não estoura — é cosmético perto de responder', async () => {
    respondeCom({ error: { message: 'qualquer coisa', code: 1 } });

    await expect(envio().marcarComoLida('wamid.X')).resolves.toBeUndefined();
  });
});
