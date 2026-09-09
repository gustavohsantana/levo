import { Address, Coordinates, type Geocoder, type Logger } from '@/core';
import type { Regiao } from './address-query';

/**
 * Tenta os geocodificadores em ordem e para no primeiro que responde.
 *
 * A ordem é a da confiança: o IBGE (base oficial da cidade) antes do Nominatim
 * (OpenStreetMap, incompleto no interior). Cada um devolve `null` quando não
 * sabe, e o `null` do primeiro não é fim — é a vez do próximo.
 *
 * Um geocodificador que QUEBRA (banco fora do ar, API caída) também não é fim:
 * é para isso que a cascata existe. O erro é registrado e o próximo tenta. Se
 * o IBGE tem um soluço, o pedido do cliente ainda cai no Nominatim em vez de
 * falhar por inteiro. Só quando todos passam sem achar é que devolve `null` —
 * e aí o chamador segue (todos convertem em "não localizado" e pedem o pino).
 */
export class CascataGeocoder implements Geocoder {
  constructor(
    private readonly geocoders: Geocoder[],
    private readonly logger?: Logger,
  ) {}

  async geocode(address: Address, regiao?: Regiao): Promise<Coordinates | null> {
    for (const geocoder of this.geocoders) {
      try {
        const r = await geocoder.geocode(address, regiao);
        if (r) return r;
      } catch (erro) {
        // Guarda o erro para o log e passa a vez. Um geocodificador caído não
        // pode calar os outros — senão a cascata não protege de nada.
        this.logger?.warn(
          { erro: erro instanceof Error ? erro.message : String(erro) },
          'cascata.geocoder_falhou',
        );
      }
    }
    return null;
  }
}
