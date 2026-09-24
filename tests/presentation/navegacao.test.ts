import { describe, expect, it } from 'vitest';
import {
  APP_DE_MAPA_INICIAL,
  appDeMapaGuardado,
  urlDeNavegacao,
  type DestinoDaParada,
} from '@/presentation/ui/navegacao';

const comPino: DestinoDaParada = {
  coordinates: { lat: -22.2301, lng: -45.9338 },
  address: 'Rua das Flores, 100',
};

const semPino: DestinoDaParada = {
  coordinates: null,
  address: 'Rua das Flores, 100',
};

describe('navegação do motoboy', () => {
  it('abre o Google Maps por padrão, como o botão já abria', () => {
    expect(APP_DE_MAPA_INICIAL).toBe('google');
    expect(appDeMapaGuardado(null)).toBe('google');
    expect(appDeMapaGuardado(undefined)).toBe('google');
    expect(appDeMapaGuardado('')).toBe('google');
    expect(appDeMapaGuardado('maps')).toBe('google');

    expect(urlDeNavegacao(comPino, 'google')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-22.2301,-45.9338&travelmode=driving',
    );
    expect(urlDeNavegacao(semPino, 'google')).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(semPino.address)}&travelmode=driving`,
    );
  });

  it('abre o Waze quando o aparelho guardou essa escolha', () => {
    expect(appDeMapaGuardado('waze')).toBe('waze');

    const comCoordenada = new URL(urlDeNavegacao(comPino, 'waze'));
    expect(comCoordenada.origin + comCoordenada.pathname).toBe('https://waze.com/ul');
    expect(comCoordenada.searchParams.get('ll')).toBe('-22.2301,-45.9338');
    expect(comCoordenada.searchParams.get('navigate')).toBe('yes');
    expect(comCoordenada.searchParams.has('q')).toBe(false);

    const peloEndereco = new URL(urlDeNavegacao(semPino, 'waze'));
    expect(peloEndereco.origin + peloEndereco.pathname).toBe('https://waze.com/ul');
    expect(peloEndereco.searchParams.get('q')).toBe(semPino.address);
    expect(peloEndereco.searchParams.get('navigate')).toBe('yes');
    expect(peloEndereco.searchParams.has('ll')).toBe(false);
  });
});
