import { defineConfig } from 'vitest/config';

/**
 * Testes de integração: batem em Postgres de verdade.
 *
 * Separados dos unitários de propósito — os unitários rodam em memória, em
 * milissegundos, e são os que travam o commit. Estes verificam o que só o banco
 * pode provar: constraints, transações e o comportamento do Prisma.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    /*
     * A trava roda antes de qualquer arquivo de teste.
     *
     * Esta suíte apaga tabelas entre os casos, então a primeira pergunta não é
     * "os testes passam", é "posso apagar este banco". Ver `guarda-do-banco.ts`.
     */
    globalSetup: ['./tests/integration/guarda-do-banco.ts'],
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
