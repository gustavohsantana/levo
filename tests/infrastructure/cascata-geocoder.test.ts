import { describe, expect, it, vi } from 'vitest';
import { Address, Coordinates, type Geocoder } from '@/core';
import { CascataGeocoder } from '@/infrastructure/geocoding/cascata-geocoder';

const ENDERECO = Address.create('Rua Antônio de Souza Gouveia, 37 - Joaquim José Franco');
const PONTO = Coordinates.create(-22.22464, -45.93969);

/** Um geocodificador de mentira: responde o que o teste mandar. */
function fake(resposta: Coordinates | null | Error): Geocoder {
  return {
    geocode: vi.fn(async () => {
      if (resposta instanceof Error) throw resposta;
      return resposta;
    }),
  };
}

describe('CascataGeocoder', () => {
  it('para no primeiro que acha e nem chama o resto', async () => {
    const segundo = fake(Coordinates.create(0, 0));
    const cascata = new CascataGeocoder([fake(PONTO), segundo]);

    const r = await cascata.geocode(ENDERECO);

    expect(r).toBe(PONTO);
    expect(segundo.geocode).not.toHaveBeenCalled();
  });

  it('passa a vez quando o primeiro devolve null', async () => {
    const cascata = new CascataGeocoder([fake(null), fake(PONTO)]);
    expect(await cascata.geocode(ENDERECO)).toBe(PONTO);
  });

  it('passa a vez quando o primeiro QUEBRA — é para isso que a cascata existe', async () => {
    /*
     * O IBGE consulta o banco; um soluço de conexão não pode derrubar o pedido
     * inteiro quando o Nominatim ainda responderia. Antes desta guarda, a
     * exceção subia e o cliente via "endereço não localizado" à toa.
     */
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const cascata = new CascataGeocoder(
      [fake(new Error('banco fora do ar')), fake(PONTO)],
      logger as never,
    );

    expect(await cascata.geocode(ENDERECO)).toBe(PONTO);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ erro: 'banco fora do ar' }),
      'cascata.geocoder_falhou',
    );
  });

  it('devolve null quando nenhum acha (por null ou por erro)', async () => {
    const cascata = new CascataGeocoder([fake(null), fake(new Error('caiu'))]);
    expect(await cascata.geocode(ENDERECO)).toBeNull();
  });
});
