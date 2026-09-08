'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PASSOS_PEDIDO,
  hrefsDoFluxo,
  passoDaRota,
  passoJaPassou,
  type PassoPedido,
} from '@/presentation/pedido-passos';
import {
  gravarLojaDoFluxo,
  lerPagamentoPendente,
} from '@/presentation/menu-session';
import { cn } from '../cn';

/**
 * As quatro etapas do pedido no cardápio, como abas com URL própria.
 *
 * Cada uma é um link de verdade: o botão voltar do celular funciona, o Pix
 * não some no F5, e dá para voltar do QR Code não pago para o formulário.
 */
export function PedidoPassos({
  slug,
  atual,
}: {
  slug: string;
  /** Na página de rastreio a URL é `/t/…`; o passo precisa vir explícito. */
  atual?: PassoPedido;
}) {
  const pathname = usePathname();
  const passo = atual ?? passoDaRota(pathname);
  const [pendente, setPendente] = useState<ReturnType<typeof lerPagamentoPendente>>(null);

  /*
   * O efeito é o lugar certo aqui, apesar da regra: o pagamento pendente vive
   * no armazenamento do navegador, que não existe no servidor, e este estado é
   * editado pelo cliente depois de semeado — então `useSyncExternalStore`, que
   * serve para espelhar uma fonte externa, não se aplica. O render a mais no
   * montar é o preço de casar a hidratação, e é pago uma vez só.
   */
  useEffect(() => {
    gravarLojaDoFluxo(slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- semeadura a partir do armazenamento do navegador
    setPendente(lerPagamentoPendente(slug));
  }, [slug, pathname]);

  const hrefs = hrefsDoFluxo(slug, {
    pedidoId: pendente?.orderId,
    trackingToken: pendente?.trackingToken,
  });

  return (
    <nav aria-label="Etapas do pedido" className="sticky top-0 z-20 border-b bg-canvas/90 backdrop-blur">
      <ol className="mx-auto grid max-w-md grid-cols-4 px-2">
        {PASSOS_PEDIDO.map((item) => {
          const ativo = item.id === passo;
          const passado = passoJaPassou(passo, item.id);
          const href = hrefs[item.id];
          const clicavel = Boolean(href) && !ativo;

          const classe = cn(
            'flex h-11 items-center justify-center border-b-2 px-1 text-center text-[11px] font-medium sm:text-xs',
            ativo
              ? 'border-accent text-ink'
              : passado
                ? 'border-transparent text-ink-muted'
                : 'border-transparent text-ink-faint',
          );

          return (
            <li key={item.id}>
              {clicavel && href && !ativo ? (
                <Link href={href} className={classe}>
                  {item.label}
                </Link>
              ) : (
                <span className={classe} aria-current={ativo ? 'step' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
