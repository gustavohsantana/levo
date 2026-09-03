import { describe, expect, it } from 'vitest';
import { deveMostrarRoteiro, primeirosPassos } from '@/core/services/primeiros-passos';

/**
 * O roteiro da loja recém-criada.
 *
 * O painel de quem acabou de se cadastrar é honesto demais: mostra "nenhum
 * pedido esperando" e um botão que abre um formulário sem produto nenhum para
 * escolher. A pessoa conclui que o sistema está quebrado, não que ela ainda não
 * configurou nada — e desiste na primeira noite.
 */
const zerada = { produtos: 0, motoboys: 0, taxaConfigurada: false, pedidos: 0 };
const pronta = { produtos: 12, motoboys: 2, taxaConfigurada: true, pedidos: 0 };

describe('o que falta configurar', () => {
  it('loja recém-criada tem tudo por fazer', () => {
    const passos = primeirosPassos(zerada);

    expect(passos.every((p) => !p.feito)).toBe(true);
    expect(passos.map((p) => p.id)).toEqual(['produto', 'taxa', 'motoboy', 'pedido']);
  });

  it('a ordem é a de quem destrava o seguinte', () => {
    // Sem produto não dá para lançar pedido; sem pedido não há o que despachar;
    // sem motoboy não há para quem despachar.
    const ids = primeirosPassos(zerada).map((p) => p.id);

    expect(ids.indexOf('produto')).toBeLessThan(ids.indexOf('pedido'));
    expect(ids.indexOf('motoboy')).toBeLessThan(ids.indexOf('pedido'));
  });

  it('marca só o que já foi feito', () => {
    const passos = primeirosPassos({ ...zerada, produtos: 3 });

    expect(passos.find((p) => p.id === 'produto')?.feito).toBe(true);
    expect(passos.find((p) => p.id === 'motoboy')?.feito).toBe(false);
  });
});

describe('quando o roteiro sai de cena', () => {
  it('fica enquanto falta o essencial', () => {
    expect(deveMostrarRoteiro(zerada)).toBe(true);
    expect(deveMostrarRoteiro({ ...pronta, motoboys: 0 })).toBe(true);
    expect(deveMostrarRoteiro({ ...pronta, taxaConfigurada: false })).toBe(true);
  });

  it('some com cardápio, taxa e entregador prontos', () => {
    /*
     * Lista de tarefas que fica para sempre vira decoração — e ocupa a dobra da
     * tela mais usada do produto.
     */
    expect(deveMostrarRoteiro(pronta)).toBe(false);
  });

  it('o primeiro pedido não é pré-requisito para sumir', () => {
    // Ele é convite, não exigência: a loja já está pronta para o pedido que
    // vier do cliente, sem precisar inventar um de teste.
    expect(deveMostrarRoteiro({ ...pronta, pedidos: 0 })).toBe(false);
  });
});
