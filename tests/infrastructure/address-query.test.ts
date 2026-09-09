import { describe, expect, it } from 'vitest';
import { candidatosDeBusca, partesDoEndereco } from '@/infrastructure/geocoding/address-query';
import { montarEndereco } from '@/presentation/address-parts';

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

describe('partesDoEndereco', () => {
  it('separa o endereço do Bruno em rua, número e bairro', () => {
    // O formato que `montarEndereco` produz: "rua, número - bairro, cidade".
    // Este é o caso real que caía sem localização e motivou o IBGE.
    const { rua, numero, bairro } = partesDoEndereco(
      'Rua Antônio de Souza Gouveia, 37 - Joaquim José Franco, Pouso Alegre',
    );

    expect(rua).toBe('Rua Antônio de Souza Gouveia');
    expect(numero).toBe(37);
    expect(bairro).toBe('Joaquim José Franco');
  });

  it('devolve número 0 quando o cliente não informou', () => {
    const { rua, numero, bairro } = partesDoEndereco('Rua das Flores - Centro, Pouso Alegre');

    expect(rua).toBe('Rua das Flores');
    expect(numero).toBe(0);
    expect(bairro).toBe('Centro');
  });

  it('não inventa bairro quando não há a parte do local', () => {
    const { rua, numero, bairro } = partesDoEndereco('Rua A, 100');

    expect(rua).toBe('Rua A');
    expect(numero).toBe(100);
    expect(bairro).toBe('');
  });
});

/*
 * O contrato que quebrou em produção: a prévia do mapa montava o endereço por
 * vírgula ("rua, bairro, cidade"), mas o IBGE separa por " - ". A prévia dizia
 * "não achamos" um endereço que o pedido, montado por `montarEndereco`, achava.
 * Agora as duas usam `montarEndereco` — este teste trava as duas pontas juntas
 * para que ninguém mude o separador de um lado só.
 */
describe('montarEndereco ⇄ partesDoEndereco (o que a prévia monta, o IBGE separa)', () => {
  it('preserva rua, número e bairro no ida e volta', () => {
    const texto = montarEndereco({
      rua: 'Rua Antônio de Souza Gouveia',
      numero: '37',
      bairro: 'Joaquim José Franco',
      cidade: 'Pouso Alegre',
    });

    const { rua, numero, bairro } = partesDoEndereco(texto);
    expect(rua).toBe('Rua Antônio de Souza Gouveia');
    expect(numero).toBe(37);
    expect(bairro).toBe('Joaquim José Franco');
  });

  it('sem número, a rua e o bairro ainda voltam certos', () => {
    const texto = montarEndereco({
      rua: 'Rua das Flores',
      numero: '',
      bairro: 'Centro',
      cidade: 'Pouso Alegre',
    });

    const { rua, numero, bairro } = partesDoEndereco(texto);
    expect(rua).toBe('Rua das Flores');
    expect(numero).toBe(0);
    expect(bairro).toBe('Centro');
  });
});
