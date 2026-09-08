import type { CSSProperties } from 'react';

/**
 * Salto de página sem `redirect()` do Next.
 *
 * No WebView do Android o 307 do servidor chega vazio e a tela fica branca.
 * O meta refresh fica no mesmo host, no próprio documento, e vale já na
 * primeira leitura do HTML — não espera hidratação.
 *
 * Um `location.replace` num efeito acompanhava este refresh, e os dois juntos
 * pediam a mesma navegação duas vezes. Um Chromium moderno concilia; o 87 do
 * tablet do piloto não é terreno para apostar nisso, e um salto basta.
 *
 * O link embaixo é a saída manual: se o salto não acontecer, a tela deixa de
 * ser beco sem saída no meio da rua.
 */
export function CourierHardNav({ href, label }: { href: string; label: string }) {
  const alvo = caminhoDoApp(href);

  return (
    <main style={tela}>
      <meta httpEquiv="refresh" content={`0;url=${alvo}`} />
      <div style={caixa}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width={36}
          height={36}
          role="img"
          aria-label="Levô"
          style={{ display: 'block', marginBottom: 20, color: '#8fd12f' }}
          vectorEffect="non-scaling-stroke"
        >
          <path
            d="M7 4v10.5a2.5 2.5 0 0 0 2.5 2.5H18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="18" cy="17" r="2.75" fill="currentColor" />
        </svg>
        <h1 style={titulo}>{label}</h1>
        <p style={subtitulo}>Só um instante.</p>
        <p style={{ ...subtitulo, marginTop: 16 }}>
          <a href={alvo} style={{ color: '#4d7a12', fontWeight: 600 }}>
            Se demorar, toque aqui
          </a>
        </p>
      </div>
    </main>
  );
}

function caminhoDoApp(href: string): string {
  if (href === '/entregador' || href === '/entregador/login') return href;
  if (/^\/m\/[A-Za-z0-9_-]+$/.test(href)) return href;
  return '/entregador';
}

const tela: CSSProperties = {
  display: 'grid',
  // `vh`, e nao `dvh`: unidade de 2022, e o WebView do tablet e de 2020.
  // Estilo embutido nao passa pelo PostCSS, entao aqui nao ha rede de baixo.
  minHeight: '100vh',
  placeItems: 'center',
  padding: '40px 20px',
  background: '#faf9f7',
  color: '#1c1917',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  WebkitTextSizeAdjust: '100%',
  textSizeAdjust: '100%',
};

const caixa: CSSProperties = {
  width: '100%',
  maxWidth: 384,
};

const titulo: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: '#1c1917',
};

const subtitulo: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 14,
  lineHeight: 1.45,
  color: '#6b675f',
};
