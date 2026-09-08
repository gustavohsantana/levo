import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/*
 * Instrument Sans na interface e JetBrains Mono nos números.
 *
 * Não é Inter de propósito: Inter em cima de shadcn padrão virou a assinatura
 * visual de aplicação gerada por IA. A Instrument tem o mesmo rigor de
 * grotesca de interface com um desenho menos onipresente.
 */
/*
 * Pesos fixos, e nao a fonte variavel.
 *
 * Sem `weight` o next/font baixa o arquivo variavel (`font-weight: 400 700`), e
 * o FreeType do WebView Chromium 87 — o do tablet do piloto, congelado em 2020
 * — mata o processo que desenha a pagina ao instanciar esse eixo na SEGUNDA
 * pagina aberta. A primeira sempre passa, entao parecia defeito da tela de
 * destino: o motoboy entrava, aparecia "Entrando…", e o app fechava.
 *
 * Provado no aparelho: bloqueando so estes dois arquivos, tres paginas seguidas
 * carregam; liberando, cai sempre na segunda. Instancias estaticas nao tem eixo
 * para instanciar, e o desenho na tela e o mesmo.
 */
const sans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

// Mesma armadilha da Instrument: variavel de 100 a 800. Aqui ela so numera
// valores e horarios, entao dois pesos bastam.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Levô',
  description: 'Gestão inteligente de rotas para quem entrega com motoboy próprio',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1917' },
  ],
  width: 'device-width',
  initialScale: 1,
  // O motoboy usa com uma mão, na rua: zoom acidental atrapalha mais que ajuda,
  // mas bloquear zoom por completo quebra acessibilidade. Limite generoso.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
