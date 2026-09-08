import type { CSSProperties } from 'react';

/**
 * Login do app do motoboy.
 *
 * Estilos embutidos de propósito: se o CSS não entrar — e no WebView de tablet
 * antigo isso já aconteceu — esta tela ainda precisa ser usável. Sem classe, o
 * SVG da marca explode a tela e o botão vira o cinza do sistema.
 *
 * Pelo mesmo motivo o formulário é um `<form method="post">` comum, e não um
 * componente com Server Action: ele funciona com o JavaScript morto. É a porta
 * do turno do motoboy; ela abre mesmo quando o resto não abre.
 */

const RECADOS = {
  dados: 'Confira o usuário e a senha.',
  limite: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  credenciais: 'Usuário ou senha não conferem.',
} as const;

export type ErroDeLogin = keyof typeof RECADOS;

export function CourierLoginScreen({ erro }: { erro?: ErroDeLogin }) {
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

        <form method="post" action="/entregador/entrar" style={formulario}>
          <label style={campo}>
            <span style={rotulo}>Usuário</span>
            <input
              name="login"
              autoComplete="username"
              required
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="jefferson"
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={rotulo}>Senha</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={input}
            />
          </label>

          {erro ? (
            <p role="alert" style={aviso}>
              {RECADOS[erro]}
            </p>
          ) : null}

          <button type="submit" style={botao}>
            Entrar
          </button>
        </form>
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

const formulario: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: '100%',
};

const campo: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: '100%',
};

const rotulo: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#6b675f',
};

const input: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 7,
  border: '1px solid #e2ded6',
  background: '#fff',
  color: '#1c1917',
  fontSize: 16,
  fontFamily: 'inherit',
};

const aviso: CSSProperties = {
  margin: 0,
  padding: '8px 12px',
  borderRadius: 7,
  background: '#fde8e6',
  color: '#b42318',
  fontSize: 12,
};

const botao: CSSProperties = {
  boxSizing: 'border-box',
  marginTop: 4,
  width: '100%',
  height: 44,
  border: 0,
  borderRadius: 7,
  background: '#8fd12f',
  color: '#1b2708',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
