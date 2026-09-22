import { describe, expect, it } from 'vitest';
import { MAX_STOPS_PER_LINK, googleMapsRouteUrl, stopNavUrl } from '@/presentation/ui/maps-link';

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

describe('stopNavUrl', () => {
  const comPino = { coordinates: { lat: -22.229914, lng: -45.935824 }, address: 'Rua Um, 10' };
  const semPino = { coordinates: null, address: 'Rua Trajano Reis, 300 - São Francisco' };

  it('navega por coordenada no Google Maps quando há pino', () => {
    const url = new URL(stopNavUrl(comPino, 'google'));
    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('destination')).toBe('-22.229914,-45.935824');
    expect(url.searchParams.get('travelmode')).toBe('driving');
  });

  it('navega por coordenada no Waze quando há pino', () => {
    const url = new URL(stopNavUrl(comPino, 'waze'));
    expect(url.hostname).toBe('waze.com');
    // O Waze usa `ll=lat,lng` e `navigate=yes` para já entrar em navegação.
    expect(url.searchParams.get('ll')).toBe('-22.229914,-45.935824');
    expect(url.searchParams.get('navigate')).toBe('yes');
  });

  it('cai para o endereço escrito quando a parada não tem pino', () => {
    const google = new URL(stopNavUrl(semPino, 'google'));
    expect(google.searchParams.get('destination')).toBe(semPino.address);

    const waze = new URL(stopNavUrl(semPino, 'waze'));
    expect(waze.searchParams.get('q')).toBe(semPino.address);
    expect(waze.searchParams.get('navigate')).toBe('yes');
  });

  it('arredonda a coordenada para seis casas, como o link de rota', () => {
    const url = new URL(
      stopNavUrl({ coordinates: { lat: -25.419999999999998, lng: -49.2 }, address: '' }, 'google'),
    );
    expect(url.searchParams.get('destination')).toBe('-25.42,-49.2');
  });
});
