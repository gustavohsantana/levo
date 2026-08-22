import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cliente gerado pelo Prisma: não é código nosso, não é revisado, e
    // encheria o relatório com ruído que ninguém vai (nem deve) corrigir.
    "src/generated/**",
  ]),
  {
    rules: {
      // Prefixo `_` marca parâmetro deliberadamente ignorado — comum em mock
      // que precisa declarar a assinatura para o TypeScript inspecionar as
      // chamadas, sem usar os argumentos.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
