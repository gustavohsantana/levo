/**
 * Link do Google Maps com a rota inteira, para o motoboy bater o olho no
 * trajeto antes de sair.
 *
 * Não substitui o "Navegar" de cada parada: quem sai navegando tudo pelo Maps
 * não volta ao app entre as entregas, e sem o toque em "Entreguei" o rastreio
 * do cliente congela em "a caminho". Este link é visão geral; a confirmação
 * continua acontecendo parada a parada.
 */

/**
 * A Maps URLs API aceita no máximo nove pontos intermediários. Como a última
 * parada vai em `destination`, cabem dez paradas por link.
 */
export const MAX_WAYPOINTS = 9;
export const MAX_STOPS_PER_LINK = MAX_WAYPOINTS + 1;

export interface MapsStop {
  coordinates: { lat: number; lng: number } | null;
}

export interface MapsRouteLink {
  url: string;
  /** Quantas paradas couberam. Menor que o total quando a rota é longa. */
  included: number;
  /** Quantas ficaram de fora do link — a interface avisa quando passa de zero. */
  omitted: number;
}

/**
 * `null` quando não sobrou nenhuma parada com coordenada: sem ponto no mapa não
 * existe rota para abrir, e um link quebrado no meio do turno é pior do que um
 * botão que não aparece.
 */
export function googleMapsRouteUrl(stops: readonly MapsStop[]): MapsRouteLink | null {
  const located = stops.filter(
    (stop): stop is MapsStop & { coordinates: { lat: number; lng: number } } =>
      stop.coordinates !== null,
  );

  if (located.length === 0) return null;

  const included = located.slice(0, MAX_STOPS_PER_LINK);
  const points = included.map(({ coordinates }) => `${sixDecimals(coordinates.lat)},${sixDecimals(coordinates.lng)}`);

  // `destination` é a última parada; o resto vira waypoint na ordem em que o
  // OSRM entregou. A Maps URLs API respeita essa ordem — não reordena por
  // conta própria —, então a otimização feita aqui sobrevive à travessia.
  const destination = points[points.length - 1]!;
  const waypoints = points.slice(0, -1);

  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' });

  // `origin` fica de fora de propósito: sem ele o Maps parte de onde o motoboy
  // está agora, que é o que serve no meio do turno — e ainda economiza um dos
  // pontos do orçamento para uma parada de verdade.
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'));

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    included: included.length,
    omitted: located.length - included.length,
  };
}

/**
 * Seis casas decimais são ~10 cm — muito além do que um endereço geocodificado
 * garante. O que vem do banco é `Float`, e sem corte a soma dos erros de ponto
 * flutuante escreve `-25.419999999999998` na URL: dez paradas assim incham o
 * link sem entregar precisão nenhuma.
 */
function sixDecimals(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * O app de navegação que o motoboy prefere abrir.
 *
 * A escolha é dele, guardada no aparelho: quem entrega de moto em cidade
 * grande costuma jurar pelo Waze, e forçar o Google seria empurrar uma troca de
 * contexto a cada parada. O padrão é o Google porque é o que a maioria já tem
 * instalado e o que abre no navegador quando não há app nenhum.
 */
export type MapProvider = 'google' | 'waze';

export interface NavStop {
  coordinates: { lat: number; lng: number } | null;
  /** Endereço escrito, usado quando a parada não tem pino. */
  address: string;
}

/**
 * Link de navegação para UMA parada, no app que o motoboy escolheu.
 *
 * Só uma parada de propósito: o Waze não aceita rota com paradas intermediárias
 * por URL, e mesmo no Google o "Navegar" de cada parada é o que faz o motoboy
 * voltar ao app para confirmar a entrega. A visão geral com várias paradas é
 * outra coisa (`googleMapsRouteUrl`), e continua só no Google.
 *
 * Sem pino, navega pelo endereço escrito: o app de mapa acha endereço que o
 * nosso geocodificador não achou, então mandar o texto é uma chance a mais de
 * o motoboy chegar sem ligar para ninguém.
 */
export function stopNavUrl(stop: NavStop, provider: MapProvider): string {
  if (provider === 'waze') {
    const destino = stop.coordinates
      ? `ll=${sixDecimals(stop.coordinates.lat)},${sixDecimals(stop.coordinates.lng)}`
      : `q=${encodeURIComponent(stop.address)}`;
    return `https://waze.com/ul?${destino}&navigate=yes`;
  }

  const destination = stop.coordinates
    ? `${sixDecimals(stop.coordinates.lat)},${sixDecimals(stop.coordinates.lng)}`
    : encodeURIComponent(stop.address);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}
