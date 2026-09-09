import { describe, expect, it } from 'vitest';
import {
  chaveDeLogradouro,
  coordenadaDoNumero,
} from '@/core/services/geocodificador-local';

/**
 * O geocodificador que a loja constrói da própria cidade, a partir do IBGE.
 *
 * A rua do Bruno não existe no OpenStreetMap; existe no censo. O que estes
 * testes protegem é a parte que decide: normalizar a chave, e achar o ponto do
 * número certo — com a lição de que o bairro desempata ruas de mesmo nome.
 */
describe('chave de logradouro', () => {
  it('a mesma rua escrita de vários jeitos vira a mesma chave', () => {
    const c = chaveDeLogradouro('Rua Antônio de Souza Gouveia');
    expect(chaveDeLogradouro('R. Antonio de Souza Gouvêia')).toBe(c);
    expect(chaveDeLogradouro('ANTONIO DE SOUZA GOUVEIA')).toBe(c);
  });

  it('tipos diferentes de logradouro não atrapalham', () => {
    expect(chaveDeLogradouro('Av. Brasil')).toBe(chaveDeLogradouro('Avenida Brasil'));
  });
});

describe('coordenada pelo número', () => {
  /* Os números reais da Rua Antônio de Souza Gouveia no Joaquim José Franco. */
  const rua = [
    { numero: 32, lat: -22.224649, lng: -45.939689 },
    { numero: 39, lat: -22.224639, lng: -45.939685 },
    { numero: 41, lat: -22.224543, lng: -45.939629 },
  ];

  it('interpola o 37 entre o 32 e o 39', () => {
    // O caso do Bruno: 37 não existe no censo, mas o 32 e o 39 sim.
    const p = coordenadaDoNumero(37, rua)!;

    expect(p.lat).toBeGreaterThan(-22.2247);
    expect(p.lat).toBeLessThan(-22.2246);
    // Fica entre os dois pontos que o cercam.
    expect(p.lng).toBeLessThan(-45.93968);
    expect(p.lng).toBeGreaterThan(-45.93969);
  });

  it('número exato conhecido é ele mesmo', () => {
    const p = coordenadaDoNumero(39, rua)!;
    expect(p.lat).toBe(-22.224639);
  });

  it('número fora da faixa cai no extremo mais próximo, não em outra rua', () => {
    const alto = coordenadaDoNumero(999, rua)!;
    expect(alto.lat).toBe(-22.224543); // o maior conhecido (41)
  });

  it('sem número, devolve um ponto da rua', () => {
    expect(coordenadaDoNumero(0, rua)).not.toBeNull();
  });

  it('rua sem nenhum ponto conhecido não inventa coordenada', () => {
    expect(coordenadaDoNumero(37, [])).toBeNull();
  });
});
