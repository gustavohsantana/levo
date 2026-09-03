import { describe, expect, it } from 'vitest';
import { podeApagar } from '../integration/guarda-do-banco';

/**
 * A trava que impede a suíte de integração de apagar um banco de verdade.
 *
 * Existe porque o pior já aconteceu: a suíte rodou com a DATABASE_URL de
 * produção e apagou 856 pedidos, 129 rotas e os pagamentos. Nada avisou.
 *
 * A trava que só é exercitada no dia do acidente é uma trava que ninguém sabe
 * se funciona. Por isso a decisão é pura, e por isso ela tem teste.
 */
describe('posso apagar este banco?', () => {
  it('recusa banco com pedidos de verdade', () => {
    const r = podeApagar({ pedidos: 856, confirmacao: undefined });

    expect(r.permitido).toBe(false);
    expect(r.motivo).toContain('856');
  });

  it('deixa passar banco vazio', () => {
    expect(podeApagar({ pedidos: 0, confirmacao: undefined }).permitido).toBe(true);
  });

  it('deixa passar o resíduo dos próprios testes', () => {
    // A suíte cria pedidos enquanto roda; o teto tolera isso sem virar chateação.
    expect(podeApagar({ pedidos: 12, confirmacao: undefined }).permitido).toBe(true);
  });

  it('a porta de fuga precisa da palavra exata', () => {
    expect(podeApagar({ pedidos: 856, confirmacao: 'sim' }).permitido).toBe(false);
    expect(podeApagar({ pedidos: 856, confirmacao: '1' }).permitido).toBe(false);
    expect(podeApagar({ pedidos: 856, confirmacao: 'confirmo' }).permitido).toBe(true);
  });
});
