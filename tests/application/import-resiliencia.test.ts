import { beforeEach, describe, expect, it } from 'vitest';
import { ImportOrderFromSource } from '@/application/use-cases/orders/import-order-from-source';
import {
  FixedClock,
  InMemoryDatabase,
  InMemoryUnitOfWork,
  SequentialIds,
} from '@/infrastructure/fakes/in-memory';
import type { ExternalOrder } from '@/core';
import { FakeGeocoder, FakeOrderSource, newDatabase } from '../helpers/fixtures';

/**
 * Duas lições da homologação reprovada do iFood, viradas em teste.
 *
 * A primeira custou o ponto de acknowledgment: um pedido que o domínio sempre
 * recusa ficava para sempre sem ack, voltava a cada 30 segundos e levava junto
 * os eventos do mesmo lote.
 *
 * A segunda custou os 10 pontos do cenário de confirmação: aceitar dependia de
 * alguém ver a tela, e o iFood dá 3 minutos.
 */
const clock = new FixedClock(new Date('2026-08-31T22:00:00Z'));
let db: InMemoryDatabase;

function pedido(id: string, over: Partial<ExternalOrder> = {}): ExternalOrder {
  return {
    externalId: id,
    customerName: 'Cliente',
    customerPhone: null,
    address: 'Rua Exemplo, 100 - Curitiba',
    reference: null,
    amountCents: 2700,
    notes: null,
    placedAt: new Date('2026-08-31T21:59:00Z'),
    ...over,
  };
}

function importador(aceitaSozinho?: () => Promise<boolean>) {
  return new ImportOrderFromSource(
    new InMemoryUnitOfWork(db),
    new FakeGeocoder(),
    new SequentialIds('order'),
    clock,
    'est-1',
    undefined,
    aceitaSozinho,
  );
}

beforeEach(() => {
  db = newDatabase();
});

describe('pedido que o domínio sempre recusa', () => {
  it('sai da fila em vez de travá-la para sempre', async () => {
    // Endereço vazio: `Address.create` recusa, e vai recusar de novo amanhã.
    const source = new FakeOrderSource([pedido('IF-1', { address: '' }), pedido('IF-2')]);

    const r = await importador().execute(source);

    expect(r.failed).toBe(1);
    expect(r.imported).toBe(1);
    // O quebrado tambem foi reconhecido: repetir nao mudaria o resultado.
    expect(source.acknowledged).toContain('IF-1');
    expect(source.acknowledged).toContain('IF-2');
  });

  it('o bom entra mesmo com um quebrado no mesmo lote', async () => {
    const source = new FakeOrderSource([pedido('IF-1', { address: '' }), pedido('IF-2')]);

    await importador().execute(source);

    expect([...db.orders.values()].map((o) => o.externalId)).toEqual(['IF-2']);
  });
});

describe('aceite automático', () => {
  it('aceita na importação quando a loja está configurada para isso', async () => {
    const source = new FakeOrderSource([pedido('IF-9')]);

    await importador(async () => true).execute(source);

    const order = [...db.orders.values()][0];
    expect(order.confirmedAt).not.toBeNull();
  });

  it('enfileira o CONFIRM para a plataforma junto com o pedido', async () => {
    const source = new FakeOrderSource([pedido('IF-9')]);

    await importador(async () => true).execute(source);

    expect([...db.marketplace.values()].map((c) => c.command)).toEqual(['CONFIRM']);
  });

  it('não aceita nada quando a loja não pediu — aceitar é compromisso', async () => {
    const source = new FakeOrderSource([pedido('IF-9')]);

    await importador(async () => false).execute(source);

    expect([...db.orders.values()][0].confirmedAt).toBeNull();
    expect(db.marketplace.size).toBe(0);
  });

  it('falha ao ler a configuração não impede o pedido de entrar', async () => {
    const source = new FakeOrderSource([pedido('IF-9')]);

    await importador(async () => {
      throw new Error('banco fora do ar');
    }).execute(source);

    expect([...db.orders.values()]).toHaveLength(1);
    expect([...db.orders.values()][0].confirmedAt).toBeNull();
  });
});
