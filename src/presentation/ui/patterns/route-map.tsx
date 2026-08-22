'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '../polyline';

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  kind: 'origin' | 'stop' | 'done' | 'courier' | 'destination';
}

/**
 * Mapa Leaflet com tiles do OpenStreetMap.
 *
 * Sem chave de API e sem custo — o que mantém o piloto gratuito de ponta a
 * ponta. Trocar por MapTiler ou Google é mudar a URL do tile.
 *
 * Feito com Leaflet direto, sem react-leaflet: os marcadores mudam a cada 10
 * segundos e recriar a árvore React inteira a cada atualização faria o mapa
 * piscar. Aqui a camada é atualizada no lugar.
 */
export function RouteMap({
  markers,
  geometry,
  trail,
  className,
}: {
  markers: MapMarker[];
  geometry?: string | null;
  trail?: Array<{ lat: number; lng: number }>;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  const path = useMemo(() => (geometry ? decodePolyline(geometry) : null), [geometry]);

  useEffect(() => {
    if (!container.current || map.current) return;

    map.current = L.map(container.current, { zoomControl: false, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map.current);
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

    if (path) {
      L.polyline(path, { color: 'oklch(56% 0.16 258)', weight: 4, opacity: 0.6 }).addTo(layer.current);
      bounds.push(...path);
    }

    if (trail && trail.length > 1) {
      // Trajeto realmente percorrido, tracejado sobre a rota planejada: a
      // diferença entre os dois é a informação mais útil da tela para o dono.
      L.polyline(
        trail.map((point) => [point.lat, point.lng] as [number, number]),
        { color: 'oklch(78% 0.185 128)', weight: 3, dashArray: '4 5' },
      ).addTo(layer.current);
    }

    for (const marker of markers) {
      L.marker([marker.lat, marker.lng], { icon: iconFor(marker), title: marker.label })
        .addTo(layer.current)
        .bindPopup(marker.label);
      bounds.push([marker.lat, marker.lng]);
    }

    if (bounds.length > 0) {
      map.current.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 16 });
    }
  }, [markers, path, trail]);

  return <div ref={container} className={className} role="application" aria-label="Mapa da rota" />;
}

const STYLES: Record<MapMarker['kind'], { bg: string; fg: string; size: number }> = {
  origin: { bg: 'oklch(21% 0.012 75)', fg: '#fff', size: 26 },
  stop: { bg: 'oklch(56% 0.16 258)', fg: '#fff', size: 26 },
  done: { bg: 'oklch(90% 0.007 85)', fg: 'oklch(48% 0.012 75)', size: 22 },
  destination: { bg: 'oklch(78% 0.185 128)', fg: 'oklch(26% 0.07 128)', size: 28 },
  courier: { bg: 'oklch(78% 0.185 128)', fg: 'oklch(26% 0.07 128)', size: 32 },
};

/**
 * O marcador é um círculo pequeno, então só cabe um glifo — nunca o rótulo.
 * O nome do lugar vive no `title` e no popup, que é onde ele é legível.
 */
function glyphFor(marker: MapMarker): string {
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
  const style = STYLES[marker.kind];

  return L.divIcon({
    className: '',
    html:
      `<div style="width:${style.size}px;height:${style.size}px;background:${style.bg};` +
      `color:${style.fg};border-radius:999px;display:grid;place-items:center;` +
      `font:600 12px/1 var(--font-instrument-sans,sans-serif);` +
      `box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.25)">${glyphFor(marker)}</div>`,
    iconSize: [style.size, style.size],
    iconAnchor: [style.size / 2, style.size / 2],
  });
}
