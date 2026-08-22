#!/usr/bin/env node
/**
 * ⚠️  STUB DE DESENVOLVIMENTO — NÃO USE EM PRODUÇÃO ⚠️
 *
 * Fala o protocolo do OSRM (`/table` e `/route`) mas calcula tudo em LINHA
 * RETA, a 25 km/h. Ignora ruas, mão única, semáforo e trânsito.
 *
 * Serve para uma coisa só: rodar a interface de ponta a ponta quando não dá
 * para subir o OSRM real — por exemplo em máquina sem Docker, ou atrás de proxy
 * que bloqueia o registro de imagens.
 *
 * Os minutos economizados que ele produz NÃO valem como evidência: para o
 * piloto, use `./infra/osrm-prepare.sh` e o OSRM de verdade.
 *
 *   node infra/osrm-stub.mjs        # sobe em http://localhost:5000
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 5000);
const SPEED_MS = 25_000 / 3600; // 25 km/h em metros por segundo

function haversine(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function parseCoordinates(segment) {
  return segment.split(';').map((pair) => {
    const [lng, lat] = pair.split(',').map(Number);
    return { lat, lng };
  });
}

/** Codifica no formato polyline do Google, precisão 5. */
function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let output = '';

  const chunk = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let result = '';
    while (v >= 0x20) {
      result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return result + String.fromCharCode(v + 63);
  };

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    output += chunk(lat - lastLat) + chunk(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }

  return output;
}

createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const [, service, , , coordinates] = url.pathname.split('/');
  const points = parseCoordinates(coordinates ?? '');

  const send = (payload) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ code: 'Ok', ...payload }));
  };

  if (service === 'table') {
    return send({
      durations: points.map((from) =>
        points.map((to) => Math.round(haversine(from, to) / SPEED_MS)),
      ),
    });
  }

  if (service === 'route') {
    const legs = points.slice(0, -1).map((from, index) => {
      const meters = haversine(from, points[index + 1]);
      return { distance: Math.round(meters), duration: Math.round(meters / SPEED_MS) };
    });

    return send({
      routes: [
        {
          geometry: encodePolyline(points),
          distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
          duration: legs.reduce((sum, leg) => sum + leg.duration, 0),
          legs,
        },
      ],
    });
  }

  response.writeHead(404).end('{}');
}).listen(PORT, () => {
  console.log(`\n  ⚠️  STUB do OSRM em http://localhost:${PORT}`);
  console.log('  Rotas em linha reta — só para desenvolvimento.\n');
});
