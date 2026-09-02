'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '../polyline';
import { MAP_COLORS, MAP_TILES } from '../map-config';

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  kind: 'origin' | 'stop' | 'done' | 'courier' | 'destination';
  /** O número da parada. Sem ele, o mapa mostra onde, mas não em que ordem. */
  numero?: number;
  /** Cor própria — usada para separar um motoboy do outro no mesmo mapa. */
  cor?: string;
}

/** Uma rota desenhada no mapa. Várias quando há mais de um motoboy na rua. */
export interface MapRoute {
  geometry: string | null;
  cor: string;
}

/**
 * Mapa da rota.
 *
 * Feito com Leaflet direto, sem react-leaflet: os marcadores mudam a cada 10
 * segundos e recriar a árvore React inteira faria o mapa piscar. Aqui as
 * camadas são atualizadas no lugar.
 */
export function RouteMap({
  markers,
  geometry,
  routes,
  trail,
  className,
  onPick,
  center,
}: {
  markers: MapMarker[];
  geometry?: string | null;
  /** Mais de uma rota ao mesmo tempo, cada uma com sua cor. */
  routes?: MapRoute[];
  trail?: Array<{ lat: number; lng: number }>;
  className?: string;
  /** Quando informado, clicar no mapa escolhe uma coordenada. */
  onPick?: (coordinates: { lat: number; lng: number }) => void;
  /** Enquadramento inicial quando ainda não há marcador nenhum. */
  center?: { lat: number; lng: number };
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  /**
   * O mapa de fundo não carregou.
   *
   * Acontece de verdade: rede corporativa que bloqueia o servidor de tiles,
   * celular sem dados, servidor fora do ar. Sem tratar, sobra um retângulo
   * cinza que parece bug — e o dono conclui que o produto está quebrado, quando
   * a rota e as paradas estão ali, desenhadas e corretas.
   */
  const [tilesFailed, setTilesFailed] = useState(false);

  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  const path = useMemo(() => (geometry ? decodePolyline(geometry) : null), [geometry]);

  const caminhos = useMemo(
    () =>
      (routes ?? [])
        .filter((r) => r.geometry)
        .map((r) => ({ pontos: decodePolyline(r.geometry!), cor: r.cor })),
    [routes],
  );

  useEffect(() => {
    if (!container.current || map.current) return;

    map.current = L.map(container.current, {
      zoomControl: false,
      attributionControl: true,
    });

    map.current.on('click', (event: L.LeafletMouseEvent) => {
      pick.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    const tiles = L.tileLayer(MAP_TILES.url, {
      maxZoom: MAP_TILES.maxZoom,
      attribution: MAP_TILES.attribution,
      // Tiles em @2x deixam o texto das ruas nítido em tela retina, que é onde
      // o dono e o motoboy olham.
      detectRetina: true,
    });

    let failures = 0;
    tiles.on('tileerror', () => {
      // Um tile isolado falha por qualquer motivo; três seguidos indicam que a
      // fonte inteira está inacessível.
      failures += 1;
      if (failures >= 3) setTilesFailed(true);
    });
    tiles.on('tileload', () => setTilesFailed(false));

    tiles.addTo(map.current);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;

    layer.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    /*
     * Cada motoboy com sua cor, mesmo contorno branco.
     *
     * Sem o contorno, duas rotas que se cruzam viram um nó ilegível — e num
     * sábado elas se cruzam o tempo todo, porque saem todas do mesmo lugar.
     */
    for (const caminho of caminhos) {
      L.polyline(caminho.pontos, {
        color: MAP_COLORS.routeCasing,
        weight: 8,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(layer.current);

      L.polyline(caminho.pontos, {
        color: caminho.cor,
        weight: 4,
        opacity: 1,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(layer.current);

      bounds.push(...caminho.pontos);
    }

    if (path) {
      /**
       * Traçado em duas camadas: uma branca mais grossa por baixo, a colorida
       * por cima.
       *
       * É a técnica padrão de cartografia — sem o contorno, uma linha azul
       * sobre ruas azuladas ou sobre um parque verde some. Com ele, a rota lê
       * limpa em cima de qualquer fundo.
       */
      L.polyline(path, {
        color: MAP_COLORS.routeCasing,
        weight: 9,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(layer.current);

      L.polyline(path, {
        color: MAP_COLORS.route,
        weight: 5,
        opacity: 1,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(layer.current);

      bounds.push(...path);
    }

    if (trail && trail.length > 1) {
      // Trajeto realmente percorrido, tracejado sobre a rota planejada: a
      // diferença entre os dois é a informação mais útil da tela para o dono.
      L.polyline(
        trail.map((point) => [point.lat, point.lng] as [number, number]),
        { color: MAP_COLORS.trail, weight: 3.5, dashArray: '3 6', lineCap: 'round' },
      ).addTo(layer.current);
    }

    /*
     * Duas paradas na mesma coordenada existem de verdade: o geocodificador
     * devolve o centro da rua quando não conhece o número, então dois pedidos
     * na mesma via caem no mesmo ponto. Empilhados, um marcador esconde o
     * outro e a rota parece ter perdido uma parada.
     *
     * O desempate afasta os repetidos em círculo, poucos metros — longe o
     * bastante para os dois aparecerem, perto o bastante para não mentir sobre
     * onde é.
     */
    const vistos = new Map<string, number>();

    for (const marker of markers) {
      const chave = `${marker.lat.toFixed(5)},${marker.lng.toFixed(5)}`;
      const repetido = vistos.get(chave) ?? 0;
      vistos.set(chave, repetido + 1);

      const { lat, lng } = repetido === 0
        ? marker
        : afastar(marker, repetido);

      L.marker([lat, lng], {
        icon: iconFor(marker),
        title: marker.label,
        // O motoboy fica por cima de tudo; paradas concluídas, por baixo.
        zIndexOffset: marker.kind === 'courier' ? 1000 : marker.kind === 'done' ? -100 : 0,
      })
        .addTo(layer.current)
        .bindPopup(marker.label);

      bounds.push([lat, lng]);
    }

    if (bounds.length > 0) {
      map.current.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16 });
    } else if (center) {
      map.current.setView([center.lat, center.lng], 14);
    }
  }, [markers, path, caminhos, trail, center]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={container}
        className={className}
        role="application"
        aria-label={onPick ? 'Mapa para escolher o local da entrega' : 'Mapa da rota'}
      />

      {tilesFailed ? (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-md bg-surface/95 px-3 py-2 text-xs text-ink-muted shadow-sm">
          Mapa de fundo indisponível — sem internet ou servidor de mapas fora do ar.
          <span className="text-ink-faint"> A rota e as paradas abaixo estão corretas.</span>
        </p>
      ) : null}
    </div>
  );
}

const STYLES: Record<
  MapMarker['kind'],
  { bg: string; fg: string; size: number; ring: string }
> = {
  origin: { bg: MAP_COLORS.origin, fg: MAP_COLORS.onDark, size: 28, ring: '#fff' },
  stop: { bg: MAP_COLORS.stop, fg: MAP_COLORS.onDark, size: 28, ring: '#fff' },
  done: { bg: MAP_COLORS.done, fg: MAP_COLORS.ink, size: 22, ring: '#fff' },
  destination: { bg: MAP_COLORS.accent, fg: MAP_COLORS.accentInk, size: 30, ring: '#fff' },
  courier: { bg: MAP_COLORS.accent, fg: MAP_COLORS.accentInk, size: 34, ring: '#fff' },
};

/**
 * O marcador é um círculo pequeno, então só cabe um glifo — nunca o rótulo.
 * O nome do lugar vive no `title` e no popup, que é onde ele é legível.
 */
function glyphFor(marker: MapMarker): string {
  // O número manda: saber a ordem vale mais que saber o tipo da parada.
  if (marker.numero !== undefined) return String(marker.numero);

  switch (marker.kind) {
    case 'courier':
      return '🛵';
    case 'origin':
      return '⌂';
    case 'destination':
      return '★';
    case 'done':
      return '✓';
    case 'stop':
      // Aqui o rótulo é "3. Fulano": o número é o glifo.
      return marker.label.split('.')[0].trim().slice(0, 2);
  }
}

function iconFor(marker: MapMarker): L.DivIcon {
  const base = STYLES[marker.kind];
  /*
   * A cor do motoboy vence a do tipo — menos na parada já entregue, que fica
   * apagada de propósito: ela não é mais trabalho a fazer, e destacá-la com a
   * cor viva competiria com as que ainda importam.
   */
  const style =
    marker.cor && marker.kind !== 'done' ? { ...base, bg: marker.cor, fg: MAP_COLORS.onDark } : base;
  const font = marker.kind === 'courier' ? 16 : 12;

  return L.divIcon({
    className: '',
    html:
      `<div style="width:${style.size}px;height:${style.size}px;background:${style.bg};` +
      `color:${style.fg};border-radius:999px;display:grid;place-items:center;` +
      `font:600 ${font}px/1 var(--font-instrument-sans,system-ui,sans-serif);` +
      // Anel branco + sombra: separa o marcador do mapa em qualquer fundo.
      `box-shadow:0 0 0 2.5px ${style.ring},0 2px 8px rgba(0,0,0,.3)">${glyphFor(marker)}</div>`,
    iconSize: [style.size, style.size],
    iconAnchor: [style.size / 2, style.size / 2],
    popupAnchor: [0, -style.size / 2],
  });
}

/**
 * Afasta um marcador repetido em círculo.
 *
 * ~12 metros por volta, o suficiente para separar visualmente sem sugerir que
 * a entrega é noutro lugar. A posição é determinística: o mesmo conjunto de
 * paradas desenha sempre igual, e um mapa que muda a cada atualização faria o
 * dono achar que o pedido se moveu.
 */
function afastar(
  ponto: { lat: number; lng: number },
  indice: number,
): { lat: number; lng: number } {
  const raio = 0.00011 * Math.ceil(indice / 6);
  const angulo = (indice * 2 * Math.PI) / 6;

  return {
    lat: ponto.lat + raio * Math.cos(angulo),
    lng: ponto.lng + raio * Math.sin(angulo),
  };
}
