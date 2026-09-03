'use client';

import { Route } from 'lucide-react';
import {
  pedidosVizinhos,
  textoDoEspalhamento,
  type PedidoParaAgrupar,
} from '@/core/services/pedidos-vizinhos';

/**
 * "Estes três dão uma viagem só."
 *
 * O roteirizador já ordena bem os destinos DENTRO de uma leva. O que faltava era
 * avisar, na hora de montar a leva, que aqueles pedidos eram vizinhos — porque
 * quem monta é o dono, e numa noite cheia ele não compara endereço por endereço.
 *
 * Sugere e nunca decide. O dono tem motivos que o sistema não vê: o cliente que
 * já ligou cobrando, o pedido que sai frio, o motoboy que mora para aquele lado.
 * O botão seleciona os pedidos e para por aí — quem escolhe o motoboy e quem
 * aperta despachar continua sendo ele.
 */
export function VizinhosSugeridos({
  pedidos,
  selecionados,
  onSelecionar,
}: {
  pedidos: PedidoParaAgrupar[];
  selecionados: Set<string>;
  onSelecionar: (ids: string[]) => void;
}) {
  const grupos = pedidosVizinhos(pedidos);

  /*
   * Some quando o grupo já está inteiro selecionado.
   *
   * Sugestão que continua ali depois de aceita vira ruído, e ruído na tela mais
   * usada do produto é o que faz o dono parar de ler os avisos que importam.
   */
  const pendentes = grupos.filter((g) => !g.ids.every((id) => selecionados.has(id)));
  if (pendentes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {pendentes.slice(0, 3).map((grupo) => (
        <div
          key={grupo.ids.join('-')}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-moving-soft px-3 py-2"
        >
          <Route className="size-4 shrink-0 text-moving" aria-hidden />

          <p className="text-sm text-ink">
            <span className="font-medium">{grupo.ids.length} pedidos</span>{' '}
            {textoDoEspalhamento(grupo.espalhamento)} — dá uma viagem só.
          </p>

          <button
            type="button"
            onClick={() => onSelecionar(grupo.ids)}
            className="ml-auto shrink-0 text-sm font-medium text-moving hover:underline"
          >
            Selecionar os {grupo.ids.length}
          </button>
        </div>
      ))}
    </div>
  );
}
