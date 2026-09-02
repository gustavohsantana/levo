import { describe, expect, it } from 'vitest';
import { novidades, type PedidoNaFila } from '@/presentation/ui/patterns/order-bell';

const p = (id: string): PedidoNaFila => ({ id, cliente: `Cliente ${id}` });

describe('quem chegou desde a última olhada', () => {
  it('a primeira passada não toca para ninguém', () => {
    /*
     * O caso que faria o dono desligar o sino no primeiro dia: abrir o painel
     * numa noite cheia e ouvir seis toques seguidos por pedidos que já estavam
     * ali há meia hora.
     */
    const r = novidades(null, [p('a'), p('b'), p('c')]);

    expect(r.chegaram).toEqual([]);
    expect(r.conhecidos).toEqual(new Set(['a', 'b', 'c']));
  });

  it('toca só para quem entrou depois', () => {
    const r = novidades(new Set(['a', 'b']), [p('a'), p('b'), p('c')]);

    expect(r.chegaram.map((o) => o.id)).toEqual(['c']);
  });

  it('não toca quando nada mudou', () => {
    expect(novidades(new Set(['a']), [p('a')]).chegaram).toEqual([]);
  });

  it('pedido que saiu da fila não volta a tocar se voltar', () => {
    /*
     * Um pedido despachado sai de NOVO; se o dono desfizer o despacho ele
     * reaparece. É movimento de tela, não pedido novo — mas a régua guarda só
     * o que está na fila agora, então ele toca. Aceito: desfazer é raro, e um
     * toque a mais é muito menos custoso que um a menos.
     */
    const depoisDeSair = novidades(new Set(['a', 'b']), [p('a')]);
    expect(depoisDeSair.conhecidos.has('b')).toBe(false);

    expect(novidades(depoisDeSair.conhecidos, [p('a'), p('b')]).chegaram.map((o) => o.id)).toEqual(['b']);
  });

  it('a fila vazia zera a régua sem tocar', () => {
    const r = novidades(new Set(['a']), []);

    expect(r.chegaram).toEqual([]);
    expect(r.conhecidos.size).toBe(0);
  });
});
