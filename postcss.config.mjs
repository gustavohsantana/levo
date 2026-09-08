import { fileURLToPath } from 'node:url';

/*
 * Caminho absoluto, e não './postcss-webview-antigo.mjs': o Turbopack resolve
 * plugin de PostCSS a partir de `.next/build/chunks`, onde o relativo aponta
 * para o nada. O erro sai como "Cannot find module" no meio do build do CSS.
 */
const webviewAntigo = fileURLToPath(new URL('./postcss-webview-antigo.mjs', import.meta.url));

const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    // Depois do Tailwind, sempre: ele é quem cria as camadas que este desfaz.
    [webviewAntigo]: {},
  },
};

export default config;
