'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { Check, LoaderCircle, MapPin } from 'lucide-react';
import { localizarEnderecoAction } from '@/presentation/public-menu';

const RouteMap = dynamic(() => import('./route-map').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});

/**
 * O cliente confirma onde fica, antes de enviar o pedido.
 *
 * O mapa erra por coisas que ninguém controla: rua nova, loteamento recente, ou
 * uma letra — "Resende" e "Rezende" são a mesma rua para gente e duas para o
 * mapa, e a segunda simplesmente não existe.
 *
 * Quando isso acontece, quem sabe onde mora é o cliente, e ele está com o
 * telefone na mão AGORA. Descobrir depois, no painel, é o dono ligando para
 * perguntar onde é — ou o motoboy rodando atrás.
 *
 * Aparece só quando a busca falha. Endereço encontrado não vira pergunta: pedir
 * confirmação do que já está certo é atrito puro, e ensina a pessoa a clicar
 * sem ler.
 */
export function ConfirmarNoMapa({
  slug,
  endereco,
  origem,
  onPin,
}: {
  slug: string;
  /** Já montado a partir dos campos. Vazio enquanto faltar preencher. */
  endereco: string;
  /** A loja: é o enquadramento inicial, porque a entrega é perto dela. */
  origem: { lat: number; lng: number };
  onPin: (pin: { lat: number; lng: number } | null) => void;
}) {
  const [estado, setEstado] = useState<'parado' | 'buscando' | 'achou' | 'nao_achou'>('parado');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [verificando, verificar] = useTransition();

  function conferir() {
    if (endereco.trim().length < 8) return;

    setEstado('buscando');
    verificar(async () => {
      const r = await localizarEnderecoAction(slug, endereco);
      if (r.ok) {
        setEstado('achou');
        // Encontrado pelo texto: o servidor refaz a busca ao criar o pedido.
        setPin(null);
        onPin(null);
      } else {
        setEstado('nao_achou');
      }
    });
  }

  /*
   * Confere sozinho quando o cliente termina de digitar.
   *
   * Antes dependia de um clique em "Conferir", e ninguém clica no opcional — o
   * pedido caía sem localização. Agora, parado de digitar por um instante, a
   * verificação roda: se acha, mostra o "encontrado" sem atrito; se não acha, o
   * mapa aparece na hora, com o cliente ainda pensando em onde mora.
   *
   * O timer evita disparar a cada tecla (e queimar a cota do geocodificador); só
   * dispara depois que o texto para de mudar. O `ultimoConferido` impede repetir
   * a mesma busca quando outro campo do formulário muda sem mexer no endereço.
   */
  const ultimoConferido = useRef('');
  useEffect(() => {
    const alvo = endereco.trim();
    if (alvo.length < 8 || alvo === ultimoConferido.current) return;

    const timer = setTimeout(() => {
      ultimoConferido.current = alvo;
      conferir();
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endereco]);

  return (
    <div className="rounded-lg bg-surface p-3 hairline">
      {estado === 'parado' || estado === 'buscando' ? (
        <button
          type="button"
          onClick={conferir}
          disabled={verificando || endereco.trim().length < 8}
          className="flex w-full items-center justify-center gap-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {verificando ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <MapPin className="size-4" aria-hidden />
          )}
          {verificando ? 'Procurando no mapa…' : 'Conferir endereço no mapa'}
        </button>
      ) : null}

      {estado === 'achou' ? (
        <p className="flex items-center justify-center gap-2 text-sm text-accent-ink">
          <Check className="size-4" aria-hidden />
          Endereço encontrado no mapa
        </p>
      ) : null}

      {estado === 'nao_achou' ? (
        <div>
          <p className="text-sm font-medium text-ink">Não achamos esse endereço no mapa</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Acontece com rua nova ou nome parecido com outro. Toque no mapa para marcar onde
            você está — não precisa ser exato, só perto o bastante para o entregador achar.
          </p>

          <div className="mt-2 h-56 overflow-hidden rounded-md hairline">
            <RouteMap
              className="h-full w-full"
              center={origem}
              /* Não reenquadra depois do primeiro toque: o mapa fugiria do dedo. */
              autoFit={!pin}
              onPick={(p) => {
                setPin(p);
                onPin(p);
              }}
              markers={
                pin
                  ? [
                      { ...origem, label: 'Loja', kind: 'origin' },
                      { ...pin, label: 'Aqui', kind: 'destination' },
                    ]
                  : [{ ...origem, label: 'Loja', kind: 'origin' }]
              }
            />
          </div>

          <p className="mt-1.5 text-xs text-ink-faint">
            {pin
              ? 'Marcado. Toque de novo para ajustar.'
              : 'Sem marcar, o pedido segue mesmo assim — a loja confere depois.'}
          </p>
        </div>
      ) : null}

      <input type="hidden" name="pinLat" value={pin?.lat ?? ''} />
      <input type="hidden" name="pinLng" value={pin?.lng ?? ''} />
    </div>
  );
}
