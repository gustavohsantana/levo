import type { CSSProperties } from 'react';
import type { HistoricoDoDia as Historico } from '@/presentation/historico-do-motoboy';
import { EscolhaDoMapa } from './escolha-do-mapa';
import { HistoricoDoDia } from './historico-do-dia';
import { CourierLogoutButton } from './courier-logout-button';

/**
 * Sem rota no momento: o motoboy ja entrou, e espera o dono montar a leva.
 *
 * Estilos embutidos — mesmo motivo do login: WebView de tablet sem o CSS
 * do Tailwind deixa a tela zoada.
 */
export function CourierWaiting({
  nome,
  historico,
}: {
  nome: string;
  historico: Historico | null;
}) {
  return (
    <main style={tela}>
      <meta httpEquiv="refresh" content="8;url=/entregador" />
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
        <h1 style={titulo}>Olá, {primeiroNome(nome)}</h1>
        <p style={subtitulo}>
          Ainda não tem rota. Quando o dono montar, ela aparece aqui sozinha.
        </p>
        <div style={{ marginTop: 28 }}>
          <EscolhaDoMapa />
        </div>
        <div style={{ marginTop: 8 }}>
          <HistoricoDoDia historico={historico} mostrarTitulo />
        </div>
        <div style={{ marginTop: 32 }}>
          <CourierLogoutButton />
        </div>
      </div>
    </main>
  );
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
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
