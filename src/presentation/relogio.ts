/** Hora do servidor, fora do componente — o lint recusa `Date.now()` no render. */
export function agoraMs(): number {
  return Date.now();
}
