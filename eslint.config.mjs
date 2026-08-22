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
]);

export default eslintConfig;
