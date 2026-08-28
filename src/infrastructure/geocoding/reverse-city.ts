import { Coordinates } from '@/core';
import { env } from '@/env';
import { cidadeDoReverso } from './city-from-reverse';

interface NominatimReverse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

/**
 * Cidade a partir de uma coordenada, no mesmo Nominatim/LocationIQ da busca.
 *
 * Só devolve o nome: a localização do celular não é gravada. Serve para
 * preencher o campo no checkout, e some depois.
 */
export async function cidadePorCoordenada(lat: number, lng: number): Promise<string | null> {
  const ponto = Coordinates.create(lat, lng);
  if (!ponto.isPlausibleForBrazil) return null;

  const config = env();
  const params = new URLSearchParams({
    lat: String(ponto.lat),
    lon: String(ponto.lng),
    format: 'json',
    addressdetails: '1',
    zoom: '10',
  });
  if (config.GEOCODER_API_KEY) params.set('key', config.GEOCODER_API_KEY);

  const response = await fetch(`${config.GEOCODER_BASE_URL.replace(/\/$/, '')}/reverse?${params}`, {
    signal: AbortSignal.timeout(8_000),
    headers: {
      accept: 'application/json',
      'user-agent': config.GEOCODER_USER_AGENT,
    },
  });

  if (!response.ok) return null;

  const body = (await response.json().catch(() => ({}))) as NominatimReverse;
  return cidadeDoReverso(body.address);
}
