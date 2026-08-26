import { describe, expect, it } from 'vitest';
import { candidatosDeBusca } from '@/infrastructure/geocoding/address-query';

/**
 * O caso que motivou isto: "Av Antonio Scodeller, 1296, Faisqueira, Pouso
 * Alegre" não existe para o Nominatim, mas a mesma avenida com o nome escrito
 * por extenso, sem o bairro e com estado e país, existe.
 */
const REGIAO = { city: 'Pouso Alegre', state: 'MG' };

describe('candidatos de busca', () => {
  it('expande a abreviação da via', () => {
    const [primeiro] = candidatosDeBusca('Av Antonio Scodeller, 1296', REGIAO);

    expect(primeiro).toContain('Avenida Antonio Scodeller');
    expect(primeiro).not.toMatch(/\bAv\b/);
  });

  it('acrescenta cidade, estado e país', () => {
    const [primeiro] = candidatosDeBusca('Rua Adolfo Olinto, 250', REGIAO);

    expect(primeiro).toBe('Rua Adolfo Olinto, 250, Pouso Alegre, MG, Brasil');
  });

  it('não repete a cidade que o dono já escreveu', () => {
    const [primeiro] = candidatosDeBusca('Rua Adolfo Olinto, 250, Pouso Alegre', REGIAO);

    expect(primeiro.match(/Pouso Alegre/g)).toHaveLength(1);
  });

  it('tenta sem o bairro, que é o que mais derruba a busca', () => {
    // "Faisqueira" não existe no OSM, e a presença dela zera o resultado de uma
    // avenida que existe.
    const candidatos = candidatosDeBusca(
      'Av Antonio Scodeller, 1296, Faisqueira',
      REGIAO,
    );

    expect(candidatos.some((c) => !c.includes('Faisqueira'))).toBe(true);
  });

  it('cai para só a rua como última tentativa', () => {
    const candidatos = candidatosDeBusca('Rua das Flores, 100, Centro', REGIAO);

    // Impreciso — cai no meio da via —, mas o motoboy acha, e é melhor que
    // pedido sem pino nenhum.
    expect(candidatos[candidatos.length - 1]).toBe('Rua das Flores, Pouso Alegre, MG, Brasil');
  });

  it('vai do mais específico ao mais tolerante', () => {
    const candidatos = candidatosDeBusca('Av X, 10, Bairro Y', REGIAO);

    expect(candidatos).toHaveLength(3);
    expect(candidatos[0].length).toBeGreaterThan(candidatos[2].length);
  });

  it('não gera duplicatas quando o endereço é curto', () => {
    const candidatos = candidatosDeBusca('Rua Única', REGIAO);

    expect(new Set(candidatos).size).toBe(candidatos.length);
  });

  it('funciona sem região configurada', () => {
    const [primeiro] = candidatosDeBusca('Rua Adolfo Olinto, 250');

    expect(primeiro).toBe('Rua Adolfo Olinto, 250, Brasil');
  });
});

describe('separadores brasileiros', () => {
  it('trata hífen como vírgula', () => {
    // "Rua X, 320 - Centro" é escrita corrente; sem isto o número e o bairro
    // viravam uma coisa só e a tentativa sem bairro nunca acontecia.
    const candidatos = candidatosDeBusca('Rua Paraíba, 320 - Fátima I', REGIAO);

    expect(candidatos).toContain('Rua Paraíba, 320, Pouso Alegre, MG, Brasil');
  });

  it('não deixa candidato nenhum sem a cidade', () => {
    // Recortar partes pode levar junto a cidade escrita pelo dono — e busca sem
    // cidade casa com rua homônima em outro estado.
    const candidatos = candidatosDeBusca(
      'Av Antonio Scodeller, 1296, Faisqueira, Pouso Alegre',
      REGIAO,
    );

    expect(candidatos.every((c) => c.includes('Pouso Alegre, MG, Brasil'))).toBe(true);
  });

  it('não duplica a cidade que veio no texto', () => {
    const candidatos = candidatosDeBusca('Rua A, 1, Pouso Alegre, MG', REGIAO);

    for (const candidato of candidatos) {
      expect(candidato.match(/Pouso Alegre/g)).toHaveLength(1);
    }
  });
});
