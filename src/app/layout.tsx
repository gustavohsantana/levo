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
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
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
