import { describe, expect, it } from 'vitest';
import { statusDoRastreio, textoDoRastreio } from '@/core/services/tracking-status';

/**
 * Por que este motoboy não aparece no mapa.
 *
 * "Sem rastreio" sozinho não serve: o dono não sabe se liga cobrando, se espera,
 * ou se o problema é do sistema. Errar a causa faz ele cobrar quem está
 * cumprindo o combinado — que é pior do que não mostrar nada.
 */
const AGORA = new Date('2026-09-02T20:00:00Z');
const minutosAtras = (m: number) => new Date(AGORA.getTime() - m * 60_000);

describe('quem está mandando posição', () => {
  it('ping recente é rastreio ativo', () => {
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: minutosAtras(2),
      recusadoEm: null,
      agora: AGORA,
    });

    expect(s.estado).toBe('ATIVO');
  });

  it('silêncio curto ainda conta como ativo', () => {
    /*
     * A localização ao vivo do Telegram fica quieta quando ele está parado — é
     * economia de bateria, não falha. Acusar aos três minutos faria o dono
     * cobrar alguém que está numa fila de trânsito.
     */
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: minutosAtras(10),
      recusadoEm: null,
      agora: AGORA,
    });

    expect(s.estado).toBe('ATIVO');
  });
});

describe('quando não há posição', () => {
  it('no acordo por entrega, ausência é o combinado — não falha', () => {
    // Marcar como problema faria o dono cobrar quem está cumprindo.
    const s = statusDoRastreio({
      modo: 'CHECKIN',
      ultimoPing: null,
      recusadoEm: null,
      agora: AGORA,
    });

    expect(s.estado).toBe('POR_ENTREGA');
    expect(textoDoRastreio(s)).toBe('marca ao entregar');
  });

  it('recusa aparece como recusa, não como falta de sinal', () => {
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: null,
      recusadoEm: minutosAtras(30),
      agora: AGORA,
    });

    expect(s.estado).toBe('RECUSADO');
  });

  it('quem mandou antes e parou é "parou", não "sem sinal"', () => {
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: minutosAtras(40),
      recusadoEm: null,
      agora: AGORA,
    });

    expect(s.estado).toBe('PAROU');
  });

  it('quem nunca mandou nada está sem sinal', () => {
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: null,
      recusadoEm: null,
      agora: AGORA,
    });

    expect(s.estado).toBe('SEM_SINAL');
  });
});

describe('a recusa envelhece', () => {
  it('recusa velha não marca ninguém para sempre', () => {
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: null,
      recusadoEm: new Date(AGORA.getTime() - 40 * 60 * 60_000),
      agora: AGORA,
    });

    expect(s.estado).toBe('SEM_SINAL');
  });

  it('quem recusou e depois liberou aparece pelo dado mais novo', () => {
    // O ping é posterior à recusa: ele mudou de ideia, e a tela precisa seguir.
    const s = statusDoRastreio({
      modo: 'CONTINUOUS',
      ultimoPing: minutosAtras(3),
      recusadoEm: minutosAtras(50),
      agora: AGORA,
    });

    expect(s.estado).toBe('ATIVO');
  });
});
