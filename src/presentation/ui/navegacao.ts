/**
 * Para onde o "Navegar" manda o motoboy.
 *
 * O padrão é o Google Maps — é o que o botão já abria. Waze é escolha dele,
 * gravada no aparelho, e não uma configuração da loja.
 */

export type AppDeMapa = 'google' | 'waze';

export const APP_DE_MAPA_INICIAL: AppDeMapa = 'google';

/** Chave do aparelho. Não vai para o banco. */
export const CHAVE_DO_MAPA = 'levo:mapa';

export function appDeMapaGuardado(valor: string | null | undefined): AppDeMapa {
  return valor === 'waze' ? 'waze' : APP_DE_MAPA_INICIAL;
}

export interface DestinoDaParada {
  coordinates: { lat: number; lng: number } | null;
  address: string;
}

/**
 * O link que o botão abre.
 *
 * Com pino, as coordenadas. Sem pino, o endereço escrito — o Maps e o Waze
 * acham rua que o nosso geocodificador não achou, e o motoboy chega sem ligar
 * para ninguém.
 */
export function urlDeNavegacao(parada: DestinoDaParada, app: AppDeMapa): string {
  if (app === 'waze') {
    if (parada.coordinates) {
      const { lat, lng } = parada.coordinates;
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${encodeURIComponent(parada.address)}&navigate=yes`;
  }

  if (parada.coordinates) {
    const { lat, lng } = parada.coordinates;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parada.address)}&travelmode=driving`;
}
