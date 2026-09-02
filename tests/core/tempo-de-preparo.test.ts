import { describe, expect, it } from 'vitest';
import { estimarPreparo, faixaDePreparo } from '@/core/services/tempo-de-preparo';

/**
 * O tempo prometido ao cliente.
 *
 * É a frase mais consequente da tela: errar para menos gera ligação em quinze
 * minutos, errar muito para mais faz o pedido não acontecer. Por isso ele sai do
 * histórico da própria cozinha, e não de um chute.
 */
const historico = (n: number, base: number) =>
  Array.from({ length: n }, (_, i) => base + (i % 10) - 5);

describe('sem histórico suficiente', () => {
  it('usa o padrão da loja', () => {
    const e = estimarPreparo({ amostrasMinutos: [20, 22], naFila: 0, padraoMinutos: 30 });

    expect(e.base).toBe('PADRAO');
    expect(e.minutos).toBe(30);
  });

  it('vinte amostras já bastam para confiar no histórico', () => {
    const e = estimarPreparo({
      amostrasMinutos: historico(20, 18),
      naFila: 0,
      padraoMinutos: 45,
    });

    expect(e.base).toBe('HISTORICO');
    expect(e.minutos).toBeLessThan(45);
  });
});

describe('amostras absurdas', () => {
  it('descarta o pedido que alguém esqueceu de marcar', () => {
    /*
     * Medido na base real: mediana 18,6 min e máximo 3918 — sessenta e cinco
     * horas. Aquela amostra sozinha puxava a média de 18,6 para 23,3, um erro
     * de 25% na promessa feita ao cliente.
     */
    const comLixo = [...historico(30, 18), 3918, 2400];
    const e = estimarPreparo({ amostrasMinutos: comLixo, naFila: 0, padraoMinutos: 30 });

    expect(e.minutos).toBeLessThan(30);
    expect(e.amostras).toBe(30);
  });

  it('ignora tempo negativo ou zero', () => {
    const e = estimarPreparo({
      amostrasMinutos: [...historico(25, 20), -5, 0],
      naFila: 0,
      padraoMinutos: 30,
    });

    expect(e.amostras).toBe(25);
  });
});

describe('fila na cozinha', () => {
  const amostras = historico(40, 20);

  it('cozinha vazia promete o tempo típico', () => {
    const e = estimarPreparo({ amostrasMinutos: amostras, naFila: 1, padraoMinutos: 30 });
    const cheia = estimarPreparo({ amostrasMinutos: amostras, naFila: 8, padraoMinutos: 30 });

    expect(e.minutos).toBeLessThan(cheia.minutos);
  });

  it('sobe por faixas, e não linearmente', () => {
    /*
     * O aumento vem de usar um percentil mais alto do MESMO histórico — nenhum
     * coeficiente inventado. Com a cozinha cheia, os dias ruins deixam de ser
     * exceção e viram o caso provável.
     */
    const vazia = estimarPreparo({ amostrasMinutos: amostras, naFila: 0, padraoMinutos: 30 });
    const media = estimarPreparo({ amostrasMinutos: amostras, naFila: 4, padraoMinutos: 30 });
    const cheia = estimarPreparo({ amostrasMinutos: amostras, naFila: 9, padraoMinutos: 30 });

    expect(media.minutos).toBeGreaterThanOrEqual(vazia.minutos);
    expect(cheia.minutos).toBeGreaterThanOrEqual(media.minutos);
  });
});

describe('o texto que o cliente lê', () => {
  it('vira faixa, não número exato', () => {
    // "25 min" é promessa que o relógio dele cobra ao minuto.
    expect(faixaDePreparo(18)).toBe('15 a 20 min');
    expect(faixaDePreparo(34)).toBe('30 a 40 min');
  });

  it('nunca começa em zero', () => {
    expect(faixaDePreparo(3)).toBe('5 a 10 min');
  });
});
