/**
 * A regra de dependência, verificada.
 *
 * Arquitetura que não é checada por ferramenta vira decoração em três meses:
 * alguém importa o Prisma dentro de um caso de uso para resolver um problema
 * às 23h de uma sexta, e a partir daí o domínio deixou de ser testável sem
 * banco. Isto roda no CI e quebra o build.
 */
module.exports = {
  forbidden: [
    {
      name: 'core-e-puro',
      severity: 'error',
      comment:
        'core não conhece framework, banco nem HTTP. É o que permite testar toda a regra de ' +
        'negócio em memória, e o que deixa o worker do iFood reusar o mesmo domínio do site.',
      from: { path: '^src/core' },
      to: {
        pathNot: ['^src/core', '^node_modules/typescript'],
        path: ['^src/(application|infrastructure|presentation|app/|generated)', '^node_modules'],
      },
    },
    {
      name: 'application-so-depende-de-core',
      severity: 'error',
      comment:
        'Casos de uso falam com interfaces (ports), nunca com implementações. Trocar Postgres, ' +
        'geocodificador ou roteirizador não pode tocar em nada aqui.',
      from: { path: '^src/application' },
      to: {
        path: ['^src/infrastructure', '^src/presentation', '^src/app/', '^src/generated'],
      },
    },
    {
      name: 'infra-nao-conhece-a-interface',
      severity: 'error',
      comment: 'Infraestrutura serve a aplicação; não sabe que existe uma tela.',
      from: { path: '^src/infrastructure' },
      to: { path: ['^src/presentation', '^src/app/'] },
    },
    {
      name: 'sem-ciclos',
      severity: 'error',
      comment: 'Dependência circular esconde acoplamento e quebra a ordem de carga dos módulos.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sem-orfaos',
      severity: 'warn',
      comment: 'Arquivo que ninguém importa costuma ser código morto.',
      from: {
        orphan: true,
        pathNot: [
          '\\.(config|setup)\\.(js|cjs|mjs|ts)$',
          '^src/app/',
          '^src/generated/',
          '^worker/',
          '^prisma/',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['^src/generated', '\\.d\\.ts$'] },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require'] },
  },
};
