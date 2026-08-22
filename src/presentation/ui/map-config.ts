/**
 * Fonte do mapa de fundo.
 *
 * Padrão: OpenStreetMap. Funciona sem cadastro e é adequado ao volume do
 * piloto — mas a política de uso deles pede moderação e proíbe uso pesado, então
 * para um produto pago o caminho é MapTiler ou Stadia (faixas gratuitas
 * generosas, com chave). Trocar é preencher estas duas variáveis; nada no código
 * muda.
 *
 *   NEXT_PUBLIC_MAP_TILE_URL="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=SUA_CHAVE"
 *   NEXT_PUBLIC_MAP_ATTRIBUTION="&copy; MapTiler &copy; OpenStreetMap"
 */
export const MAP_TILES = {
  url:
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; OpenStreetMap',
  maxZoom: 19,
} as const;

/**
 * Paleta do mapa, espelhando os tokens do tema.
 *
 * Repetida aqui em vez de lida do CSS porque o Leaflet desenha em canvas e SVG
 * fora da árvore do React, onde `var(--accent)` não resolve.
 */
export const MAP_COLORS = {
  route: 'oklch(56% 0.16 258)',
  routeCasing: 'oklch(100% 0 0)',
  trail: 'oklch(72% 0.19 128)',
  origin: 'oklch(21% 0.012 75)',
  stop: 'oklch(56% 0.16 258)',
  done: 'oklch(72% 0.010 85)',
  accent: 'oklch(78% 0.185 128)',
  accentInk: 'oklch(26% 0.07 128)',
  onDark: 'oklch(98% 0 0)',
  ink: 'oklch(21% 0.012 75)',
} as const;
