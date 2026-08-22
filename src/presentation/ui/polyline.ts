/**
 * Decodifica a polyline do OSRM (formato do Google, precisão 5).
 *
 * São ~30 linhas contra uma dependência a mais no pacote do navegador — e o
 * algoritmo é estável há mais de uma década. Não vale o peso de uma biblioteca.
 */
export function decodePolyline(encoded: string, precision = 5): Array<[number, number]> {
  const factor = 10 ** precision;
  const points: Array<[number, number]> = [];

  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += decodeValue();
    lng += decodeValue();
    points.push([lat / factor, lng / factor]);
  }

  return points;

  function decodeValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    // Bit menos significativo indica sinal (zigue-zague).
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}
