import {
  Address,
  Coordinates,
  Courier,
  Establishment,
  type ExternalOrder,
  type ExternalStatusChange,
  type Geocoder,
  Money,
  Order,
  type OrderSource,
  PhoneNumber,
  type RoutePath,
  type RoutingService,
} from '@/core';
import { InMemoryDatabase } from '@/infrastructure/fakes/in-memory';

/** Pizzaria no centro de Curitiba. */
export const PIZZARIA = new Establishment(
  'est-1',
  'Pizzaria do Zé',
  Address.create('Rua XV de Novembro, 100 - Centro, Curitiba'),
  Coordinates.create(-25.4284, -49.2733),
);

export function newDatabase(): InMemoryDatabase {
  const db = new InMemoryDatabase(PIZZARIA);
  db.couriers.set(
    'courier-1',
    new Courier('courier-1', 'est-1', 'Jefferson', PhoneNumber.create('41999990001'), true),
  );
  // Inativo de propósito: testa a recusa de despachar para quem não está
  // trabalhando.
  db.couriers.set(
    'courier-2',
    new Courier('courier-2', 'est-1', 'Rodrigo', PhoneNumber.create('41999990002'), false),
  );
  // Segundo motoboy ativo: necessário para testar disputa por PEDIDO sem
  // esbarrar antes na disputa por MOTOBOY.
  db.couriers.set(
    'courier-3',
    new Courier('courier-3', 'est-1', 'Wesley', PhoneNumber.create('41999990003'), true),
  );
  return db;
}

export function makeOrder(
  id: string,
  coordinates: Coordinates | null,
  overrides: Partial<{
    name: string;
    phone: string | null;
    amount: number;
    source: 'MANUAL' | 'WEBHOOK' | 'IFOOD' | 'AIQFOME';
    externalId: string | null;
  }> = {},
): Order {
  return Order.create({
    id,
    establishmentId: 'est-1',
    source: overrides.source ?? 'MANUAL',
    externalId: overrides.externalId ?? null,
    customerName: overrides.name ?? `Cliente ${id}`,
    customerPhone: overrides.phone === null ? null : PhoneNumber.create(overrides.phone ?? '41988887777'),
    address: Address.create(`Rua Exemplo, ${id} - Curitiba`),
    coordinates,
    amount: Money.fromReais(overrides.amount ?? 50),
  });
}

/**
 * Roteirizador de teste: trata lat/lng como plano cartesiano e devolve
 * distância euclidiana em "segundos". Determinístico e geometricamente
 * coerente, que é o que os testes precisam verificar.
 */
export class FakeRoutingService implements RoutingService {
  calls = { matrix: 0, path: 0 };

  async durationMatrix(points: Coordinates[]): Promise<number[][]> {
    this.calls.matrix++;
    return points.map((from) =>
      points.map((to) => Math.hypot(from.lat - to.lat, from.lng - to.lng) * 10_000),
    );
  }

  async path(points: Coordinates[]): Promise<RoutePath> {
    this.calls.path++;
    const legs = points.slice(0, -1).map((from, index) => {
      const seconds = Math.hypot(from.lat - points[index + 1].lat, from.lng - points[index + 1].lng) * 10_000;
      return { durationSeconds: Math.round(seconds), distanceMeters: Math.round(seconds * 8) };
    });

    return {
      geometry: 'fake_polyline',
      distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
      durationSeconds: legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
      legs,
    };
  }
}

export class FakeGeocoder implements Geocoder {
  calls = 0;

  constructor(private readonly result: Coordinates | null = Coordinates.create(-25.43, -49.27)) {}

  async geocode(): Promise<Coordinates | null> {
    this.calls++;
    return this.result;
  }
}

export class FailingGeocoder implements Geocoder {
  async geocode(): Promise<Coordinates | null> {
    throw new Error('geocodificador fora do ar');
  }
}

export class FakeOrderSource implements OrderSource {
  readonly kind = 'IFOOD' as const;
  /** Mudanças de estado que o polling trouxe nesta leitura. */
  changes: ExternalStatusChange[] = [];
  acknowledged: string[] = [];
  /** Quantas vezes o acknowledgment foi chamado, inclusive com lista vazia. */
  acknowledgeCalls = 0;

  constructor(public pending: ExternalOrder[]) {}

  statusChanges(): ExternalStatusChange[] {
    return this.changes;
  }

  async fetchPending(): Promise<ExternalOrder[]> {
    return this.pending;
  }

  async acknowledge(externalIds: string[]): Promise<void> {
    this.acknowledgeCalls++;
    this.acknowledged.push(...externalIds);
  }

  /** Simula o iFood reentregando a mesma leva no ciclo seguinte. */
  redeliver(): void {
    this.acknowledged = [];
  }
}

export function externalOrder(externalId: string): ExternalOrder {
  return {
    externalId,
    customerName: 'Cliente iFood',
    customerPhone: '41988887777',
    address: 'Rua Trajano Reis, 300 - São Francisco, Curitiba',
    reference: null,
    amountCents: 6990,
    notes: null,
    placedAt: new Date('2026-08-22T22:00:00Z'),
  };
}
