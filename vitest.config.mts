import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // tests/integration/ tem config próprio e exige Postgres migrado. Sem esta
    // exclusão o `npm test` arrastava esses arquivos junto e quebrava no CI,
    // que roda os unitários antes de aplicar as migrations.
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
  },
});
