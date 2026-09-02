import { describe, expect, it } from 'vitest';
import { mesmaRua } from '@/core/services/endereco';

/**
 * Duas grafias da mesma rua, ou duas ruas?
 *
 * Isto decide se o cliente vê uma pergunta ou não vê nada. Errar para o lado
 * frouxo devolve o bug que custou um pedido — a rua trocada em silêncio.
 * Errar para o lado rígido enche a tela de pergunta boba a cada abreviação.
 */
describe('mesma rua', () => {
  it('ignora abreviação do tipo de logradouro', () => {
    expect(mesmaRua('R. Ernani Rezende Vilela', 'Rua Ernani Rezende Vilela')).toBe(true);
    expect(mesmaRua('Av Getúlio Vargas', 'Avenida Getulio Vargas')).toBe(true);
  });

  it('ignora acento, caixa e pontuação', () => {
    expect(mesmaRua('RUA JOAO PINHEIRO', 'Rua João Pinheiro')).toBe(true);
  });

  it('separa ruas diferentes de nome parecido', () => {
    /*
     * O caso real: CEPs consecutivos em loteamento novo são ruas paralelas, e
     * os dois sobrenomes se repetem. Confundir estas duas é exatamente o erro
     * que o motoboy descobre no portão.
     */
    expect(mesmaRua('Rua Ernani Rezende Vilela', 'Rua Geralda Barbosa Vilela')).toBe(false);
  });

  it('separa ruas totalmente diferentes', () => {
    expect(mesmaRua('Rua das Flores', 'Avenida Paulista')).toBe(false);
  });
});
