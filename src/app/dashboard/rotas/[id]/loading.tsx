import { PageSkeleton } from '@/presentation/ui/patterns/page-skeleton';

/**
 * Sem isto, a navegação trava esperando o servidor.
 *
 * As duas telas mais pesadas do painel eram justamente as que não tinham
 * esqueleto: o relatório varre o período inteiro, e a rota carrega o traçado. O
 * dono clicava e a tela anterior ficava congelada — parecia que o clique não
 * pegou, e ele clicava de novo.
 */
export default function Loading() {
  return <PageSkeleton />;
}
