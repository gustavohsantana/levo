import { PageSkeleton } from '@/presentation/ui/patterns/page-skeleton';

/** O painel tem mais conteúdo: o esqueleto acompanha, para não "encolher". */
export default function Loading() {
  return <PageSkeleton linhas={6} />;
}
