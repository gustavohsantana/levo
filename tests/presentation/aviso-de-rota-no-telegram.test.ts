import { describe, expect, it } from 'vitest';
import { textoDaRotaLiberada } from '@/presentation/telegram-rota';

const parada = (n: number) => ({
  cliente: `Cliente ${n}`,
  endereco: `Rua ${n}, ${n}00 - Centro`,
});

describe('aviso de rota liberada no Telegram', () => {
  it('abre com a loja e o número de entregas, e lista na ordem', () => {
    const texto = textoDaRotaLiberada({
      loja: 'Pizzaria do Zé',
      paradas: [parada(1), parada(2)],
    });

    expect(texto).toBe(
      [
        'Pizzaria do Zé — 2 entregas',
        '',
        '1. Cliente 1',
        '   Rua 1, 100 - Centro',
        '2. Cliente 2',
        '   Rua 2, 200 - Centro',
      ].join('\n'),
    );
  });

  it('fala no singular quando é uma entrega só', () => {
    const texto = textoDaRotaLiberada({ loja: 'Pizzaria do Zé', paradas: [parada(1)] });

    expect(texto).toContain('1 entrega');
    expect(texto).not.toContain('1 entregas');
  });

  /*
   * Rota grande vira parede de texto, e o motoboy não lê a primeira parada — que
   * é a única que importa no momento em que a mensagem chega.
   */
  it('corta a lista longa e diz quantas ficaram de fora', () => {
    const paradas = Array.from({ length: 14 }, (_, i) => parada(i + 1));
    const texto = textoDaRotaLiberada({ loja: 'Pizzaria do Zé', paradas });

    expect(texto).toContain('14 entregas');
    expect(texto).toContain('10. Cliente 10');
    expect(texto).not.toContain('11. Cliente 11');
    expect(texto).toContain('…e mais 4 paradas na tela.');
  });

  it('não usa markdown, porque nome de cliente é texto de terceiro', () => {
    const texto = textoDaRotaLiberada({
      loja: 'Pizzaria do Zé',
      paradas: [{ cliente: 'Ana_Maria *Silva*', endereco: 'Rua A, 1' }],
    });

    expect(texto).toContain('Ana_Maria *Silva*');
  });
});
