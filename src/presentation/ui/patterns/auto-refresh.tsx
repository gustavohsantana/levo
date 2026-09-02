'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mantém a tela viva sem F5.
 *
 * `router.refresh()` do App Router refaz só os componentes de servidor e
 * reconcilia o resultado na árvore que já está montada — o estado do cliente
 * sobrevive. Na prática: o dono pode estar com pedidos selecionados, um diálogo
 * aberto ou o mapa arrastado, e nada disso se perde quando um pedido novo
 * aparece. É por isso que não é um `location.reload()`.
 *
 * Pausa com a aba escondida. Um painel esquecido aberto a noite inteira faria
 * uma consulta a cada poucos segundos sem ninguém olhando — e quem paga essa
 * conta é o banco do cliente.
 *
 * Volta a atualizar assim que a aba reaparece, e imediatamente: quem volta para
 * a aba quer o estado de agora, não o de daqui a dez segundos.
 */
export function AutoRefresh({ segundos = 10 }: { segundos?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const parar = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const comecar = () => {
      parar();
      timer = setInterval(() => router.refresh(), segundos * 1000);
    };

    const aoTrocarVisibilidade = () => {
      if (document.hidden) {
        parar();
      } else {
        router.refresh();
        comecar();
      }
    };

    if (!document.hidden) comecar();
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);

    return () => {
      parar();
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, [router, segundos]);

  return null;
}
