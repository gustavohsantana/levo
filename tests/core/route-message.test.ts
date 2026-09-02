import { describe, expect, it } from 'vitest';
import { mensagemDaRota, telefoneParaWhatsApp } from '@/core/services/route-message';

/**
 * A mensagem da rota.
 *
 * Lida numa moto parada no semáforo, de capacete. E o telefone errado não dá
 * erro: a mensagem simplesmente some, que é o pior tipo de falha.
 */
describe('mensagem', () => {
  const base = {
    courierName: 'Jefferson Alves',
    storeName: 'Pizzaria do Zé',
    stops: 4,
    link: 'https://levoentregas.vercel.app/m/abc123',
  };

  it('chama pelo primeiro nome e traz link e quantidade', () => {
    const texto = mensagemDaRota(base);

    expect(texto).toContain('Oi, Jefferson!');
    expect(texto).not.toContain('Alves');
    expect(texto).toContain('4 entregas');
    expect(texto).toContain(base.link);
  });

  it('não escreve "1 entregas"', () => {
    expect(mensagemDaRota({ ...base, stops: 1 })).toContain('1 entrega.');
  });

  it('com botão, o link sai do corpo', () => {
    /*
     * No Telegram o link vira Mini App num botão. Repeti-lo embaixo dele dá ao
     * motoboy duas maneiras de acertar o mesmo alvo — e a de baixo é a pior,
     * porque joga ele para fora do aplicativo.
     */
    const texto = mensagemDaRota({ ...base, comBotao: true });

    expect(texto).not.toContain(base.link);
    expect(texto).toContain('Toque abaixo');
    expect(texto).toContain('4 entregas');
  });

  it('o link é a última linha, para o WhatsApp virar botão', () => {
    const linhas = mensagemDaRota(base).split('\n');
    expect(linhas[linhas.length - 1]).toBe(base.link);
  });
});

describe('telefone', () => {
  it('põe o 55 quando falta', () => {
    expect(telefoneParaWhatsApp('(35) 99999-1234')).toBe('5535999991234');
    expect(telefoneParaWhatsApp('35 3421-1234')).toBe('553534211234');
  });

  it('respeita o 55 que já veio', () => {
    expect(telefoneParaWhatsApp('+55 35 99999-1234')).toBe('5535999991234');
  });

  it('recusa o que não é telefone em vez de mandar para o vazio', () => {
    // Mensagem para número inválido não dá erro no WhatsApp: ela some.
    expect(telefoneParaWhatsApp('123')).toBeNull();
    expect(telefoneParaWhatsApp('')).toBeNull();
    expect(telefoneParaWhatsApp('5535999991234567')).toBeNull();
  });
});
