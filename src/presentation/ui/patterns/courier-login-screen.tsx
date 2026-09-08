import type { CSSProperties } from 'react';
import { CourierLoginForm } from './courier-login-form';

/**
 * Login do app do motoboy.
 *
 * Estilos embutidos de proposito: no WebView de tablet Android antigo o CSS
 * do Tailwind as vezes nao entra (arquivo grande, oklch, @layer). Sem classe,
 * o SVG da marca explode a tela e o botao vira o cinza do sistema — exatamente
 * a tela "zoada" da foto.
 */
export function CourierLoginScreen() {
  return (
    <main style={tela}>
      <div style={caixa}>
        <div style={{ marginBottom: 32 }}>
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
          <h1 style={titulo}>Levô</h1>
          <p style={subtitulo}>Entre com o usuário e a senha que o dono da loja te passou.</p>
        </div>

        <CourierLoginForm />
      </div>
    </main>
  );
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
