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
 * Com a aba escondida ele desacelera, mas não para.
 *
 * Parar seria mais barato, e foi assim no começo. Só que a aba escondida é
 * exatamente o caso do sino: o dono está no iFood, no WhatsApp, no caixa, e o
 * pedido que chega nesse minuto é o que ele mais precisa ouvir. Um painel que
 * dorme junto com a aba não tem como avisar de nada.
 *
 * O meio-termo é a cadência: de dez em dez segundos com alguém olhando, de
 * trinta em trinta quando ninguém está. Um painel esquecido aberto a noite
 * inteira ainda consulta, mas um terço das vezes — e quem paga essa conta é o
 * banco do cliente.
 *
 * Volta ao ritmo cheio assim que a aba reaparece, e atualiza na hora: quem
 * volta para a aba quer o estado de agora, não o de daqui a dez segundos.
 */
export function AutoRefresh({
  segundos = 10,
  segundosEscondido = 30,
}: {
  segundos?: number;
  segundosEscondido?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const parar = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const comecar = () => {
      parar();
      const passo = document.hidden ? segundosEscondido : segundos;
      timer = setInterval(() => router.refresh(), passo * 1000);
    };

    const aoTrocarVisibilidade = () => {
      if (!document.hidden) router.refresh();
      comecar();
    };

    comecar();
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);

    return () => {
      parar();
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, [router, segundos, segundosEscondido]);

  return null;
}
