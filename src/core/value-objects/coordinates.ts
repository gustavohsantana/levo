import { InvalidCoordinatesError } from '../errors';

/** Caixa envolvente do Brasil, com folga. */
const BRAZIL_BOUNDS = { minLat: -34.0, maxLat: 5.3, minLng: -74.1, maxLng: -34.7 } as const;

const EARTH_RADIUS_M = 6_371_000;

export class Coordinates {
  private constructor(
    readonly lat: number,
    readonly lng: number,
  ) {}

  static create(lat: number, lng: number): Coordinates {
    const valid =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (!valid) throw new InvalidCoordinatesError(lat, lng);
    return new Coordinates(lat, lng);
  }

  /**
   * Geocodificadores erram feio com endereço brasileiro mal escrito: "Rua das
   * Flores, Centro" casa com uma rua em Portugal e volta uma coordenada
   * perfeitamente válida — só que no continente errado. Um pedido com essa
   * coordenada entra na rota e destrói a otimização inteira.
   *
   * Por isso o resultado do geocodificador passa por aqui antes de ser aceito.
   */
  get isPlausibleForBrazil(): boolean {
    return (
      this.lat >= BRAZIL_BOUNDS.minLat &&
      this.lat <= BRAZIL_BOUNDS.maxLat &&
      this.lng >= BRAZIL_BOUNDS.minLng &&
      this.lng <= BRAZIL_BOUNDS.maxLng
    );
  }

  /**
   * Distância em linha reta (Haversine), em metros.
   *
   * Não serve para otimizar rota — para isso vale o tempo real de deslocamento
   * que o OSRM devolve. Serve para checagens baratas: detectar endereço
   * absurdamente longe do estabelecimento, ordenar por proximidade na tela,
   * e como fallback quando o roteirizador está fora do ar.
   */
  distanceTo(other: Coordinates): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(other.lat - this.lat);
    const dLng = toRad(other.lng - this.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.lat)) * Math.cos(toRad(other.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
  }

  equals(other: Coordinates): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }

  /** OSRM espera `lng,lat` — invertido em relação ao resto do mundo. */
  toOsrm(): string {
    return `${this.lng},${this.lat}`;
  }

  toJSON() {
    return { lat: this.lat, lng: this.lng };
  }
}
