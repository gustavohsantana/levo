import { describe, expect, it } from 'vitest';
import { MAX_STOPS_PER_LINK, googleMapsRouteUrl } from '@/presentation/ui/maps-link';

function stopsAt(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    coordinates: { lat: -25.4 - i / 100, lng: -49.2 - i / 100 },
  }));
}

describe('googleMapsRouteUrl', () => {
  it('põe a última parada em destination e o resto como waypoints, na ordem', () => {
    const link = googleMapsRouteUrl(stopsAt(3))!;
    const params = new URL(link.url).searchParams;

    expect(params.get('destination')).toBe('-25.42,-49.22');
    expect(params.get('waypoints')).toBe('-25.4,-49.2|-25.41,-49.21');
    expect(params.get('travelmode')).toBe('driving');
  });

  it('omite origin para o Maps partir de onde o motoboy está', () => {
    const params = new URL(googleMapsRouteUrl(stopsAt(2))!.url).searchParams;
    expect(params.has('origin')).toBe(false);
  });

  it('não manda waypoints quando só resta uma parada', () => {
    const params = new URL(googleMapsRouteUrl(stopsAt(1))!.url).searchParams;

    expect(params.has('waypoints')).toBe(false);
    expect(params.get('destination')).toBe('-25.4,-49.2');
  });

  it('corta no limite do Google e informa quantas ficaram de fora', () => {
    // MAX_STOPS = 15 no planejamento de rota, contra 10 que cabem num link.
    const link = googleMapsRouteUrl(stopsAt(15))!;

    expect(link.included).toBe(MAX_STOPS_PER_LINK);
    expect(link.omitted).toBe(5);
    expect(new URL(link.url).searchParams.get('waypoints')!.split('|')).toHaveLength(9);
  });

  it('ignora parada sem coordenada em vez de mandar ponto vazio ao Maps', () => {
    const link = googleMapsRouteUrl([
      { coordinates: { lat: -25.4, lng: -49.2 } },
      { coordinates: null },
      { coordinates: { lat: -25.5, lng: -49.3 } },
    ])!;

    expect(link.included).toBe(2);
    expect(new URL(link.url).searchParams.get('waypoints')).toBe('-25.4,-49.2');
  });

  it('devolve null quando nenhuma parada tem coordenada', () => {
    expect(googleMapsRouteUrl([{ coordinates: null }])).toBeNull();
    expect(googleMapsRouteUrl([])).toBeNull();
  });
});
