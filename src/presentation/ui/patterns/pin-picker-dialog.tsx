'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { buscarEnderecoAction, fixOrderPinAction } from '@/presentation/actions';
import type { OrderView } from '@/presentation/queries';
import { Button, Input } from '../primitives';

const RouteMap = dynamic(() => import('./route-map').then((mod) => mod.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});

/**
 * Ajuste manual do pino.
 *
 * Endereço brasileiro é bagunçado: condomínio sem número, rua nova que o mapa
 * ainda não tem, "depois da igreja". O geocodificador vai errar, e sem esta
 * tela o pedido fica preso para sempre — nunca entra em rota, nunca é entregue
 * pelo sistema, e o dono volta para o papel só por causa dele.
 *
 * O caminho principal é **corrigir o texto**: digitar o endereço de novo, com
 * bairro e cidade, e ver onde o mapa o coloca. Isso é mais honesto que arrastar
 * um alfinete, porque o endereço também vai para o link de rastreio do cliente
 * e para a tela do motoboy — um pino certo com endereço errado engana os dois.
 *
 * Clicar no mapa continua existindo, para o caso em que nenhuma escrita
 * funciona: rua nova, condomínio sem número, "depois da igreja". Aí o dono, que
 * conhece a região melhor que qualquer API, marca o lugar.
 */
export function PinPickerDialog({
  order,
  origin,
  trigger,
}: {
  order: OrderView;
  origin: { lat: number; lng: number };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [endereco, setEndereco] = useState(order.address);
  const [buscando, buscar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saving, save] = useTransition();

  function confirm() {
    if (!picked) return;
    setError(null);

    save(async () => {
      const enderecoMudou = endereco.trim() !== order.address.trim();
      const result = await fixOrderPinAction(
        order.id,
        picked,
        enderecoMudou ? endereco : undefined,
      );
      if (result.ok) {
        setOpen(false);
        setPicked(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function procurar() {
    setError(null);

    buscar(async () => {
      const resultado = await buscarEnderecoAction(endereco);

      if (resultado.ok) setPicked({ lat: resultado.lat, lng: resultado.lng });
      else setError(resultado.error);
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPicked(null);
          setError(null);
          setEndereco(order.address);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-5 shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-ink">
                Onde fica a entrega de {order.customerName}?
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 truncate text-xs text-ink-muted">
                {order.address}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mb-3">
            <div className="flex gap-2">
              <Input
                value={endereco}
                onChange={(evento) => setEndereco(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault();
                    procurar();
                  }
                }}
                placeholder="Rua, número, bairro e cidade"
                aria-label="Endereço"
              />
              <Button type="button" variant="outline" onClick={procurar} disabled={buscando}>
                {buscando ? <LoaderCircle className="animate-spin" /> : <Search />}
                Procurar
              </Button>
            </div>

            <p className="mt-1.5 text-xs text-ink-faint">
              Corrija o endereço e procure. Se ainda não achar, clique no mapa —
              não precisa ser exato, só perto o suficiente para o motoboy achar.
            </p>
          </div>

          <div className="h-80 overflow-hidden rounded-md hairline">
            <RouteMap
              className="h-full w-full"
              center={origin}
              onPick={setPicked}
              markers={
                picked
                  ? [{ ...picked, label: order.customerName, kind: 'destination' }]
                  : [{ ...origin, label: 'Estabelecimento', kind: 'origin' }]
              }
            />
          </div>

          {error ? (
            <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            {picked ? (
              <p className="numeric text-xs text-ink-faint">
                {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-ink-faint">Nenhum ponto marcado ainda.</p>
            )}

            <div className="ml-auto flex gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button variant="primary" onClick={confirm} disabled={!picked || saving}>
                {saving ? <LoaderCircle className="animate-spin" /> : <MapPin />}
                Salvar local
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
