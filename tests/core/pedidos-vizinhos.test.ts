import { describe, expect, it } from 'vitest';
import {
  distanciaEmMetros,
  pedidosVizinhos,
  textoDoEspalhamento,
} from '@/core/services/pedidos-vizinhos';

/**
 * Pedidos que vale levar na mesma viagem.
 *
 * O caso real: dois pedidos entram separados, ninguém repara que vão para o
 * mesmo prédio, e saem dois motoboys — um chega, o outro chega logo atrás. O
 * cliente vê dois entregadores na mesma porta e a loja pagou duas corridas.
 */
const CENTRO = { lat: -22.2307, lng: -45.9346 };

/** Move um ponto para o norte, em metros — vira distância exata e legível. */
function aoNorte(base: { lat: number; lng: number }, metros: number) {
  return { lat: base.lat + metros / 111_320, lng: base.lng };
}

const pedido = (id: string, coordinates: { lat: number; lng: number } | null) => ({
  id,
  coordinates,
});

describe('distância entre dois pontos', () => {
  it('mede em metros com precisão de sobra para uma sugestão', () => {
    const d = distanciaEmMetros(CENTRO, aoNorte(CENTRO, 500));

    expect(d).toBeGreaterThan(495);
    expect(d).toBeLessThan(505);
  });

  it('o mesmo ponto dá zero', () => {
    expect(distanciaEmMetros(CENTRO, CENTRO)).toBe(0);
  });
});

describe('oportunidades na fila', () => {
  it('junta os que estão dentro do raio', () => {
    const grupos = pedidosVizinhos([
      pedido('a', CENTRO),
      pedido('b', aoNorte(CENTRO, 300)),
      pedido('c', aoNorte(CENTRO, 5000)),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].ids.sort()).toEqual(['a', 'b']);
    // O pedido distante não entra, e nem vira grupo sozinho.
    expect(grupos[0].ids).not.toContain('c');
  });

  it('pedido sozinho não é oportunidade', () => {
    expect(pedidosVizinhos([pedido('a', CENTRO)])).toEqual([]);
  });

  it('encadeia ao longo de um corredor', () => {
    /*
     * A perto de B, B perto de C, mas A longe de C. São três entregas na mesma
     * avenida — uma viagem, não três. O espalhamento é o que deixa o dono julgar
     * se o corredor ficou comprido demais.
     */
    const grupos = pedidosVizinhos([
      pedido('a', CENTRO),
      pedido('b', aoNorte(CENTRO, 900)),
      pedido('c', aoNorte(CENTRO, 1800)),
    ]);

    expect(grupos[0].ids.sort()).toEqual(['a', 'b', 'c']);
    expect(grupos[0].espalhamento).toBeGreaterThan(1700);
  });

  it('pedido sem coordenada fica de fora, e não é chutado para perto', () => {
    // Sem saber onde ele é, dizer que é vizinho de alguém seria inventar.
    const grupos = pedidosVizinhos([
      pedido('a', CENTRO),
      pedido('b', aoNorte(CENTRO, 200)),
      pedido('sem-pino', null),
    ]);

    expect(grupos[0].ids).not.toContain('sem-pino');
    expect(grupos[0].ids.sort()).toEqual(['a', 'b']);
  });

  it('respeita o que o motoboy consegue levar', () => {
    const muitos = Array.from({ length: 8 }, (_, i) =>
      pedido(`p${i}`, aoNorte(CENTRO, i * 50)),
    );

    const grupos = pedidosVizinhos(muitos, { maximoPorGrupo: 3 });

    expect(grupos.every((g) => g.ids.length <= 3)).toBe(true);
  });

  it('o maior grupo vem primeiro', () => {
    // É o que economiza mais viagem, e o que merece o olho na noite cheia.
    const grupos = pedidosVizinhos([
      pedido('x', aoNorte(CENTRO, 9000)),
      pedido('y', aoNorte(CENTRO, 9200)),
      pedido('a', CENTRO),
      pedido('b', aoNorte(CENTRO, 200)),
      pedido('c', aoNorte(CENTRO, 400)),
    ]);

    expect(grupos[0].ids).toHaveLength(3);
    expect(grupos[1].ids).toHaveLength(2);
  });
});

describe('o texto que o dono lê', () => {
  it('vira confiança na sugestão, ou desconfiança', () => {
    expect(textoDoEspalhamento(40)).toBe('praticamente no mesmo ponto');
    expect(textoDoEspalhamento(420)).toBe('a 400 m um do outro');
    expect(textoDoEspalhamento(1800)).toBe('a 1,8 km um do outro');
  });
});
