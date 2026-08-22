import type { Address, Coordinates, Geocoder, GeocodeCacheRepository, Logger } from '@/core';

/**
 * Decorator de cache sobre qualquer `Geocoder`.
 *
 * O caso de uso não sabe que cache existe — ele pede uma coordenada e recebe.
 * Se um dia o cache virar Redis, ou sumir, nada em `application/` muda.
 *
 * O ganho é grande porque o tráfego é repetitivo: o mesmo bairro, muitas vezes
 * o mesmo cliente, noite após noite. É o que mantém o consumo dentro da faixa
 * gratuita do provedor mesmo com o volume do piloto.
 */
export class CachedGeocoder implements Geocoder {
  constructor(
    private readonly inner: Geocoder,
    private readonly cache: GeocodeCacheRepository,
    private readonly logger?: Logger,
  ) {}

  async geocode(address: Address): Promise<Coordinates | null> {
    const key = address.cacheKey;

    const cached = await this.cache.get(key);
    if (cached) {
      this.logger?.info({ key }, 'geocode.cache_hit');
      return cached;
    }

    const found = await this.inner.geocode(address);

    // Só resultado positivo é guardado: um endereço que falhou hoje pode ser
    // corrigido no OSM amanhã, e cachear o "não achei" congelaria o erro.
    if (found) await this.cache.set(key, found);

    return found;
  }
}
