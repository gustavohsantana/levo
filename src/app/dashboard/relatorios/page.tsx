import type { Metadata } from 'next';
import { getRelatorio, hojeEmBrasilia, type FiltroRelatorio } from '@/presentation/reports';
import { Reports, type Atalho } from '@/presentation/ui/patterns/reports';

export const metadata: Metadata = { title: 'Relatórios · Levô' };
export const dynamic = 'force-dynamic';

function texto(v: string | string[] | undefined): string | null {
  const bruto = Array.isArray(v) ? v[0] : v;
  return bruto?.trim() ? bruto.trim() : null;
}

/** Volta `dias` dias a partir de hoje, no calendário de Brasília. */
function diasAtras(dias: number): string {
  const hoje = hojeEmBrasilia();
  const [ano, mes, dia] = hoje.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

const PLATAFORMAS = new Set(['MANUAL', 'SITE', 'WEBHOOK', 'IFOOD', 'AIQFOME']);
const SITUACOES = new Set(['DELIVERED', 'CANCELLED', 'FAILED', 'EM_ABERTO']);

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const hoje = hojeEmBrasilia();

  /*
   * Sete dias por padrão. Hoje sozinho engana em restaurante — segunda de manhã
   * mostraria quase nada e pareceria que o sistema está vazio.
   */
  const de = texto(q.de) ?? diasAtras(6);
  const ate = texto(q.ate) ?? hoje;

  const plataforma = texto(q.plataforma);
  const status = texto(q.status);

  const filtro: FiltroRelatorio = {
    // Invertido pelo usuário é intenção clara, não erro: aceita e ordena.
    de: de <= ate ? de : ate,
    ate: de <= ate ? ate : de,
    plataforma: plataforma && PLATAFORMAS.has(plataforma) ? (plataforma as never) : null,
    entregadorId: texto(q.entregador),
    status: status && SITUACOES.has(status) ? (status as never) : null,
    pagina: Math.max(1, Number(texto(q.pagina)) || 1),
  };

  const dados = await getRelatorio(filtro);

  const preservado = new URLSearchParams();
  if (filtro.plataforma) preservado.set('plataforma', filtro.plataforma);
  if (filtro.entregadorId) preservado.set('entregador', filtro.entregadorId);
  if (filtro.status) preservado.set('status', filtro.status);

  /** Atalhos de período mantêm os outros filtros: trocar prazo não é recomeçar. */
  const atalho = (rotulo: string, inicio: string): Atalho => {
    const p = new URLSearchParams(preservado);
    p.set('de', inicio);
    p.set('ate', hoje);
    return {
      rotulo,
      href: `/dashboard/relatorios?${p.toString()}`,
      ativo: filtro.de === inicio && filtro.ate === hoje,
    };
  };

  const atalhos: Atalho[] = [
    atalho('Hoje', hoje),
    atalho('7 dias', diasAtras(6)),
    atalho('30 dias', diasAtras(29)),
    atalho('Este mês', `${hoje.slice(0, 7)}-01`),
  ];

  return <Reports dados={dados} atalhos={atalhos} />;
}
