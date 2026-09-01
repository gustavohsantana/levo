import { describe, expect, it } from 'vitest';
import {
  consolidar,
  fimDoDia,
  hojeEmBrasilia,
  inicioDoDia,
  type LinhaRelatorio,
} from '@/presentation/reports-core';

/**
 * O relatório do dono.
 *
 * Duas coisas aqui erram calado: o fuso, que joga o movimento da noite de sexta
 * para o sábado, e o que conta como faturamento — somar cancelado infla o
 * número que ele usa para decidir compra e escala.
 */
function linha(over: Partial<LinhaRelatorio> = {}): LinhaRelatorio {
  return {
    id: 'o-1',
    quando: '2026-09-01T18:00:00.000Z',
    displayId: null,
    plataforma: 'SITE',
    cliente: 'Maria',
    endereco: 'Rua A, 10',
    entregador: 'Jefferson',
    entregadorId: 'c-1',
    metros: 2000,
    totalCents: 5000,
    taxaCents: 500,
    status: 'DELIVERED',
    minutosAteEntregar: 30,
    ...over,
  };
}

describe('dia em Brasília', () => {
  it('começa às 03:00 UTC', () => {
    // Meia-noite em Brasília é 03:00 UTC. Sem isto, o pedido das 22h entraria
    // no relatório do dia seguinte.
    expect(inicioDoDia('2026-09-01').toISOString()).toBe('2026-09-01T03:00:00.000Z');
  });

  it('termina no começo do dia seguinte', () => {
    expect(fimDoDia('2026-09-01').toISOString()).toBe('2026-09-02T03:00:00.000Z');
  });

  it('às 22h de Brasília ainda é o mesmo dia', () => {
    // 2026-09-02T01:00Z = 01/09 22:00 em Brasília.
    expect(hojeEmBrasilia(new Date('2026-09-02T01:00:00Z'))).toBe('2026-09-01');
  });
});

describe('faturamento', () => {
  it('conta só o que foi entregue', () => {
    const { resumo } = consolidar([
      linha({ id: '1', totalCents: 5000 }),
      linha({ id: '2', totalCents: 9900, status: 'CANCELLED' }),
      linha({ id: '3', totalCents: 4000, status: 'NEW' }),
    ]);

    expect(resumo.pedidos).toBe(3);
    expect(resumo.entregues).toBe(1);
    expect(resumo.cancelados).toBe(1);
    expect(resumo.emAberto).toBe(1);
    // 5000, e não 18900: cancelado e em aberto não são receita.
    expect(resumo.faturamentoCents).toBe(5000);
  });

  it('ticket médio divide pelos entregues, não pelo total de pedidos', () => {
    const { resumo } = consolidar([
      linha({ id: '1', totalCents: 5000 }),
      linha({ id: '2', totalCents: 3000 }),
      linha({ id: '3', totalCents: 9900, status: 'CANCELLED' }),
    ]);

    expect(resumo.ticketMedioCents).toBe(4000);
  });

  it('sem entrega nenhuma não divide por zero', () => {
    const { resumo } = consolidar([linha({ status: 'CANCELLED' })]);
    expect(resumo.ticketMedioCents).toBe(0);
    expect(resumo.tempoMedioMinutos).toBeNull();
  });
});

describe('quebra por plataforma e entregador', () => {
  it('soma por plataforma e calcula a fatia', () => {
    const { porPlataforma } = consolidar([
      linha({ id: '1', plataforma: 'IFOOD', totalCents: 6000 }),
      linha({ id: '2', plataforma: 'IFOOD', totalCents: 4000 }),
      linha({ id: '3', plataforma: 'SITE', totalCents: 2000 }),
    ]);

    expect(porPlataforma[0]).toMatchObject({ plataforma: 'IFOOD', pedidos: 2, valorCents: 10000 });
    expect(porPlataforma[0].fatia).toBeCloseTo(2 / 3);
    expect(porPlataforma[1]).toMatchObject({ plataforma: 'SITE', pedidos: 1 });
  });

  it('ignora pedido sem entregador na quebra por entregador', () => {
    // Pedido que o cliente retirou, ou que nunca entrou em rota, não pertence a
    // ninguém — atribuí-lo a alguém sujaria a conta de quem trabalhou.
    const { porEntregador } = consolidar([
      linha({ id: '1', entregador: 'Jefferson' }),
      linha({ id: '2', entregador: null }),
    ]);

    expect(porEntregador).toHaveLength(1);
    expect(porEntregador[0]).toMatchObject({ nome: 'Jefferson', entregas: 1 });
  });

  it('tempo médio por entregador usa só quem tem tempo', () => {
    const { porEntregador } = consolidar([
      linha({ id: '1', entregador: 'Ana', minutosAteEntregar: 20 }),
      linha({ id: '2', entregador: 'Ana', minutosAteEntregar: 40 }),
      linha({ id: '3', entregador: 'Ana', minutosAteEntregar: null }),
    ]);

    expect(porEntregador[0].tempoMedioMinutos).toBe(30);
  });
});

describe('por dia', () => {
  it('agrupa pelo dia de Brasília, não pelo de UTC', () => {
    const { porDia } = consolidar([
      // 02/09 01:00Z é 01/09 22:00 em Brasília: movimento da noite de terça.
      linha({ id: '1', quando: '2026-09-02T01:00:00.000Z' }),
      linha({ id: '2', quando: '2026-09-01T15:00:00.000Z' }),
    ]);

    expect(porDia).toHaveLength(1);
    expect(porDia[0]).toMatchObject({ dia: '2026-09-01', pedidos: 2 });
  });

  it('conta todos os pedidos, mas só soma o valor dos entregues', () => {
    const { porDia } = consolidar([
      linha({ id: '1', totalCents: 5000 }),
      linha({ id: '2', totalCents: 9900, status: 'CANCELLED' }),
    ]);

    expect(porDia[0]).toMatchObject({ pedidos: 2, valorCents: 5000 });
  });
});
