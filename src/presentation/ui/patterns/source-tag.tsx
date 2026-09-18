import type { OrderView } from '@/presentation/queries';

/**
 * De onde o pedido veio.
 *
 * Muda o que o dono pode fazer: pedido de marketplace tem contraparte lá fora
 * — aceitar aqui avisa o iFood — e pedido manual não tem. Saber a origem de
 * relance evita procurar no aplicativo errado quando o cliente liga.
 *
 * `MANUAL` não ganha etiqueta: é o caso comum, e etiquetar o comum só gasta
 * atenção. Quem não tem marca veio da nossa tela.
 */
const ETIQUETAS: Partial<Record<OrderView['source'], { texto: string; classe: string }>> = {
  IFOOD: { texto: 'iFood', classe: 'bg-[#ea1d2c]/10 text-[#c4111f]' },
  AIQFOME: { texto: 'aiqfome', classe: 'bg-[#7b2cbf]/10 text-[#6a1fb0]' },
  // O amarelo é a cor da marca do 99. Sobre fundo claro ele some, então o texto
  // usa um tom bem mais escuro que o fundo.
  FOOD99: { texto: '99Food', classe: 'bg-[#f5c518]/20 text-[#8a6d00]' },
  SITE: { texto: 'cardápio', classe: 'bg-accent-soft text-accent-ink' },
  WEBHOOK: { texto: 'webhook', classe: 'bg-raised text-ink-faint' },
};

export function SourceTag({ source }: { source: OrderView['source'] }) {
  const etiqueta = ETIQUETAS[source];
  if (!etiqueta) return null;

  return (
    <span
      className={`shrink-0 rounded-xs px-1.5 py-0.5 text-[10px] font-medium leading-tight ${etiqueta.classe}`}
    >
      {etiqueta.texto}
    </span>
  );
}
