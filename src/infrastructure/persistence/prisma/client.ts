import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Modelos que pertencem a um estabelecimento. Consultar qualquer um deles sem
 * filtrar por `establishmentId` é vazamento entre clientes.
 */
const TENANT_SCOPED = new Set([
  'User',
  'Courier',
  'Order',
  'Route',
  'DomainEventLog',
  'IntegrationCredential',
]);

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * Arame de tropeço para o filtro de tenant.
 *
 * A garantia principal é de desenho: os repositórios recebem o
 * `establishmentId` no construtor e nenhum método deles aceita esse id como
 * parâmetro — não existe assinatura que permita ler dado de outro
 * estabelecimento. Esta extensão é a segunda linha: se alguém um dia escrever
 * uma consulta solta sem o filtro, ela falha **alto**, na hora, em vez de
 * devolver dados alheios em silêncio.
 *
 * A garantia definitiva é Row-Level Security no Postgres, onde nem um bug de
 * aplicação vaza. Com um cliente só isso é peso sem retorno; o schema já nasce
 * compatível, e o gatilho para ligar é o segundo cliente.
 */
function withTenantGuard(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const shouldGuard =
            model && TENANT_SCOPED.has(model) && READ_OPERATIONS.has(operation);

          if (shouldGuard) {
            const where = (args as { where?: Record<string, unknown> }).where;
            if (!where || where.establishmentId === undefined) {
              throw new Error(
                `[tenant-guard] ${model}.${operation} sem filtro de establishmentId. ` +
                  'Use um repositório — eles já carregam o escopo do estabelecimento.',
              );
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type LevoPrismaClient = ReturnType<typeof withTenantGuard>;

let singleton: LevoPrismaClient | undefined;

export function getPrismaClient(connectionString: string): LevoPrismaClient {
  // Em desenvolvimento o Next recarrega módulos a cada mudança; sem o
  // singleton, cada recarga abre um pool novo e o Postgres recusa conexão.
  if (!singleton) {
    singleton = withTenantGuard(new PrismaClient({ adapter: new PrismaPg({ connectionString }) }));
  }
  return singleton;
}
