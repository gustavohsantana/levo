'use client';

import { useEffect, useState } from 'react';
import { SinoDePedidos, type PedidoNaFila } from './order-bell';

const DEZ_SEGUNDOS = 10_000;
const MEIO_MINUTO = 30_000;

/**
 * O sino da barra lateral, que busca a própria fila.
 *
 * Ele vive no layout, então aparece em Catálogo, Relatórios, Configurações — em
 * toda tela onde o dono pode estar quando um pedido cai. Antes o aviso morava
 * na tela de Pedidos, que é justamente a única onde ele não faz falta.
 *
 * Busca sozinho em vez de esperar o `router.refresh()`: recarregar a rota
 * inteira a cada dez segundos refaria o catálogo enquanto o dono edita um
 * produto, para saber uma coisa que cabe em poucas linhas de JSON.
 */
export function SinoDaBarra() {
  const [novos, setNovos] = useState<PedidoNaFila[]>([]);

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const buscar = async () => {
      try {
        const resposta = await fetch('/api/pedidos/novos', { cache: 'no-store' });
        if (!resposta.ok) return;

        const dados = (await resposta.json()) as { pedidos: PedidoNaFila[] };
        /*
         * `vivo` guarda contra a resposta que chega depois da tela trocar: sem
         * isto o React reclama de atualizar o que já saiu da árvore.
         */
        if (vivo) setNovos(dados.pedidos);
      } catch {
        // Rede caiu ou o servidor reiniciou. A próxima rodada tenta de novo.
      } finally {
        if (vivo) {
          /*
           * `setTimeout` encadeado, e não `setInterval`: com a rede lenta o
           * intervalo empilharia buscas em cima de buscas que ainda não
           * voltaram. Assim a próxima só é marcada quando esta termina.
           */
          timer = setTimeout(buscar, document.hidden ? MEIO_MINUTO : DEZ_SEGUNDOS);
        }
      }
    };

    void buscar();

    // Voltou para a aba: busca na hora, sem esperar o resto do intervalo.
    const aoVoltar = () => {
      if (document.hidden) return;
      if (timer) clearTimeout(timer);
      void buscar();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  return <SinoDePedidos novos={novos} comLista />;
}
