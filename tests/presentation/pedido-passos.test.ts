import { describe, expect, it } from 'vitest';
import { hrefsDoFluxo, passoDaRota, passoJaPassou } from '@/presentation/pedido-passos';

describe('passoDaRota', () => {
  it('reconhece cada URL do fluxo', () => {
    expect(passoDaRota('/cardapio/pizzaria-do-ze')).toBe('cardapio');
    expect(passoDaRota('/cardapio/pizzaria-do-ze/pedido')).toBe('pedido');
    expect(passoDaRota('/cardapio/pizzaria-do-ze/pagamento')).toBe('pagamento');
    expect(passoDaRota('/t/abc123')).toBe('acompanhar');
  });
});

describe('hrefsDoFluxo', () => {
  it('só liga pagamento e rastreio quando tem id', () => {
    const vazio = hrefsDoFluxo('pizzaria-do-ze');
    expect(vazio.cardapio).toBe('/cardapio/pizzaria-do-ze');
    expect(vazio.pedido).toBe('/cardapio/pizzaria-do-ze/pedido');
    expect(vazio.pagamento).toBeNull();
    expect(vazio.acompanhar).toBeNull();

    const cheio = hrefsDoFluxo('pizzaria-do-ze', {
      pedidoId: 'pedido-1',
      trackingToken: 'tok',
    });
    expect(cheio.pagamento).toBe('/cardapio/pizzaria-do-ze/pagamento?pedido=pedido-1');
    expect(cheio.acompanhar).toBe('/t/tok');
  });
});

describe('passoJaPassou', () => {
  it('permite voltar nas etapas anteriores', () => {
    expect(passoJaPassou('pagamento', 'pedido')).toBe(true);
    expect(passoJaPassou('pagamento', 'cardapio')).toBe(true);
    expect(passoJaPassou('pedido', 'pagamento')).toBe(false);
    expect(passoJaPassou('pedido', 'pedido')).toBe(false);
  });
});
