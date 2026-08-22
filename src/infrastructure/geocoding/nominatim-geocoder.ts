import {
  Address,
  Coordinates,
  ExternalServiceError,
  type Geocoder,
  type Logger,
} from '@/core';

interface Options {
  baseUrl: string;
  /** LocationIQ e afins exigem chave; Nominatim público, não. */
  apiKey?: string;
  /** Obrigatório na política do Nominatim: precisa identificar quem chama. */
  userAgent: string;
  countryCode?: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  logger?: Logger;
}

interface NominatimResult {
  lat: string;
  lon: string;
  importance?: number;
}

/**
 * Geocodificador para qualquer API compatível com Nominatim.
 *
 * Serve tanto o Nominatim público (desenvolvimento) quanto o LocationIQ
 * (produção do piloto, 5.000 chamadas/dia na faixa gratuita), porque o
 * LocationIQ é um Nominatim hospedado e responde no mesmo formato. Trocar de
 * provedor é mudar `baseUrl` e `apiKey` no composition root.
 */
export class NominatimGeocoder implements Geocoder {
  private readonly options: Required<Omit<Options, 'apiKey' | 'logger'>> &
    Pick<Options, 'apiKey' | 'logger'>;

  /**
   * As chamadas são serializadas nesta corrente de promessas.
   *
   * A política do Nominatim é de no máximo 1 requisição por segundo, e ela é
   * aplicada por bloqueio de IP — não por erro amigável. Quando 8 pedidos caem
   * juntos no começo da noite, sem isto sairiam 8 requisições simultâneas e o
   * servidor sumiria justamente no pico.
   */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: Options) {
    this.options = {
      baseUrl: options.baseUrl.replace(/\/$/, ''),
      apiKey: options.apiKey,
      userAgent: options.userAgent,
      countryCode: options.countryCode ?? 'br',
      minIntervalMs: options.minIntervalMs ?? 1_100,
      timeoutMs: options.timeoutMs ?? 8_000,
      logger: options.logger,
    };
  }

  async geocode(address: Address): Promise<Coordinates | null> {
    return this.enqueue(() => this.search(address));
  }

  private async search(address: Address): Promise<Coordinates | null> {
    const params = new URLSearchParams({
      q: address.searchable,
      format: 'json',
      limit: '1',
      countrycodes: this.options.countryCode,
      addressdetails: '0',
    });
    if (this.options.apiKey) params.set('key', this.options.apiKey);

    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/search?${params}`, {
        signal: AbortSignal.timeout(this.options.timeoutMs),
        headers: { accept: 'application/json', 'user-agent': this.options.userAgent },
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'falha de rede';
      throw new ExternalServiceError('Geocodificador', reason);
    }

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ExternalServiceError('Geocodificador', `HTTP ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[] | { error?: string };
    if (!Array.isArray(results) || results.length === 0) {
      this.options.logger?.warn({ address: address.raw }, 'geocode.not_found');
      return null;
    }

    const coordinates = Coordinates.create(Number(results[0].lat), Number(results[0].lon));

    // Endereço brasileiro escrito às pressas ("Rua das Flores, Centro") casa com
    // ruas homônimas em Portugal e volta uma coordenada perfeitamente válida no
    // continente errado. Aceitar isso arruína a rota inteira, então é melhor
    // tratar como "não encontrado" e deixar o dono ajustar o pino na mão.
    if (!coordinates.isPlausibleForBrazil) {
      this.options.logger?.warn(
        { address: address.raw, ...coordinates.toJSON() },
        'geocode.outside_brazil',
      );
      return null;
    }

    return coordinates;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.then(
      () => sleep(this.options.minIntervalMs),
      () => sleep(this.options.minIntervalMs),
    );
    return result;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
