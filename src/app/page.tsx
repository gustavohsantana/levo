import type { Metadata } from 'next';
import { Landing } from '@/presentation/ui/patterns/landing';

/**
 * A raiz é a página pública de apresentação.
 *
 * Antes ela só redirecionava para `/login`, o que deixava o produto sem
 * endereço para mostrar a quem ainda não tem conta — avaliador de integração
 * inclusive. Quem já tem sessão continua caindo no painel: `/login` cuida
 * desse desvio, e mantê-lo lá preserva esta página estática, sem leitura de
 * cookie no caminho.
 */
export const metadata: Metadata = {
  title: 'Levô · Rotas para quem entrega com motoboy próprio',
  description:
    'O Levô organiza as entregas do turno: calcula a melhor ordem das paradas, põe a rota no celular do motoboy e dá ao cliente um link para acompanhar a moto em tempo real.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Levô',
    title: 'Levô · Rotas para quem entrega com motoboy próprio',
    description:
      'Junta os pedidos do turno, calcula a melhor ordem das entregas e mostra a moto ao vivo para o dono e para o cliente.',
  },
};

export default function Home() {
  return <Landing />;
}
