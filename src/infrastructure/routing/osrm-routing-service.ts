import {
  Coordinates,
  ExternalServiceError,
  type Logger,
  type RoutePath,
  type RoutingService,
} from '@/core';

interface Options {
  baseUrl: string;
  profile?: string;
  timeoutMs?: number;
  logger?: Logger;
}

/**
 * Cliente do OSRM.
 *
 * Apontar para o servidor público (`router.project-osrm.org`) só é aceitável em
 * desenvolvimento: a política de uso dele proíbe uso comercial sistemático, e
 * um rate limit no sábado à noite custa o cliente do piloto. Em produção sobe a
 * própria instância em Docker com o extract da região — de graça, na VM da
 * Oracle. Ver `infra/` e a Parte 4 do plano.
 */
export class OsrmRoutingService implements RoutingService {
  private readonly baseUrl: string;
  private readonly profile: string;
  private readonly timeoutMs: number;
  private readonly logger?: Logger;

  constructor(options: Options) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.profile = options.profile ?? 'driving';
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.logger = options.logger;
  }

  async durationMatrix(points: Coordinates[]): Promise<number[][]> {
    this.assertEnoughPoints(points);

    const payload = await this.request<{ durations?: number[][] }>('table', points, {
      annotations: 'duration',
    });

    if (!payload.durations) {
      throw new ExternalServiceError('OSRM', 'resposta sem matriz de durações');
    }

    // O OSRM devolve `null` no lugar de pares inalcançáveis. Vira Infinity para
    // que o otimizador recuse a rota com uma mensagem clara, em vez de somar
    // `null` e produzir NaN silencioso.
    return payload.durations.map((row) => row.map((value) => value ?? Infinity));
  }

  async path(points: Coordinates[]): Promise<RoutePath> {
    this.assertEnoughPoints(points);

    const payload = await this.request<{
      routes?: Array<{
        geometry?: string;
        distance: number;
        duration: number;
        legs: Array<{ distance: number; duration: number }>;
      }>;
    }>('route', points, { overview: 'full', geometries: 'polyline', steps: 'false' });

    const route = payload.routes?.[0];
    if (!route) throw new ExternalServiceError('OSRM', 'nenhuma rota encontrada');

    return {
      geometry: route.geometry ?? null,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      legs: route.legs.map((leg) => ({
        distanceMeters: Math.round(leg.distance),
        durationSeconds: Math.round(leg.duration),
      })),
    };
  }

  private async request<T>(
    service: 'table' | 'route',
    points: Coordinates[],
    params: Record<string, string>,
  ): Promise<T> {
    const path = points.map((point) => point.toOsrm()).join(';');
    const query = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${service}/v1/${this.profile}/${path}?${query}`;

    const started = Date.now();
    let response: Response;

    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { accept: 'application/json' },
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'falha de rede';
      throw new ExternalServiceError('OSRM', reason, { service });
    }

    if (!response.ok) {
      throw new ExternalServiceError('OSRM', `HTTP ${response.status}`, { service });
    }

    const payload = (await response.json()) as { code?: string; message?: string } & T;

    if (payload.code && payload.code !== 'Ok') {
      throw new ExternalServiceError('OSRM', payload.message ?? payload.code, { service });
    }

    this.logger?.info(
      { service, points: points.length, ms: Date.now() - started },
      'osrm.request',
    );

    return payload;
  }

  private assertEnoughPoints(points: Coordinates[]): void {
    if (points.length < 2) {
      throw new ExternalServiceError('OSRM', 'são necessários ao menos dois pontos');
    }
  }
}
