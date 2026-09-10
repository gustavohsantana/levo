'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, LoaderCircle, MessageCircle, X } from 'lucide-react';
import {
  estadoWhatsappAction,
  pedirQrWhatsappAction,
  type EstadoWhatsapp,
} from '@/presentation/whatsapp-actions';
import { alternarRotaNoWhatsappAction } from '@/presentation/actions';
import { Button } from '../primitives';

/**
 * Conectar o WhatsApp que avisa o motoboy.
 *
 * O QR nasce na VM do worker e chega aqui pelo banco — a ponte não é esta tela.
 * Por isso ela apenas pede e observa: enquanto o pedido está de pé, consulta de
 * dois em dois segundos, que é rápido o bastante para um código que vive um
 * minuto.
 */
export function WhatsappConnect({ inicial }: { inicial: EstadoWhatsapp }) {
  const [estado, setEstado] = useState(inicial);
  const [pedindo, pedir] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const conectado = estado.status === 'WORKING';

  useEffect(() => {
    // Só enquanto há o que observar: sondar uma tela parada gasta banco à toa.
    if (conectado && !estado.aguardando) return;
    if (!estado.aguardando && estado.status !== 'SCAN_QR_CODE') return;

    const t = setInterval(async () => {
      setEstado(await estadoWhatsappAction());
    }, 2000);
    return () => clearInterval(t);
  }, [conectado, estado.aguardando, estado.status]);

  function conectar() {
    setErro(null);
    pedir(async () => {
      const r = await pedirQrWhatsappAction();
      if (!r.ok) {
        setErro(r.error ?? 'Não foi possível pedir o código.');
        return;
      }
      setEstado(await estadoWhatsappAction());
    });
  }

  return (
    <div className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp do motoboy
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            A rota pronta chega pelo WhatsApp, com o link da tela do motoboy.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            conectado ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-ink-muted'
          }`}
        >
          {conectado ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      {conectado ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink">
            <Check className="size-4 text-accent-ink" aria-hidden />
            Número {estado.conectadoComo ? formatarNumero(estado.conectadoComo) : 'pareado'}
          </p>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              defaultChecked={estado.ligado}
              onChange={(e) => void alternarRotaNoWhatsappAction(e.target.checked)}
            />
            Avisar o motoboy quando a rota for planejada
          </label>
        </>
      ) : estado.qrBase64 ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${estado.qrBase64}`}
            alt="QR Code para conectar o WhatsApp"
            className="size-56 rounded-md bg-white p-2"
          />
          <p className="text-center text-xs leading-relaxed text-ink-muted">
            No celular: <strong className="text-ink">WhatsApp → Dispositivos conectados →
            Conectar dispositivo</strong>
          </p>
          <p className="text-center text-xs text-ink-faint">
            O código vale cerca de um minuto. Se vencer, aparece outro sozinho.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Use um número dedicado, não o que recebe pedido: a ponte não é oficial do WhatsApp
            e o número pode ser bloqueado. Se acontecer, você perde a automação, não a loja.
          </p>

          <Button variant="primary" onClick={conectar} disabled={pedindo || estado.aguardando}>
            {pedindo || estado.aguardando ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : null}
            {estado.aguardando ? 'Gerando código…' : 'Conectar WhatsApp'}
          </Button>

          {estado.aguardando ? (
            <p className="mt-2 text-xs text-ink-faint">
              Pode levar alguns segundos: quem gera o código é o servidor que fala com o
              WhatsApp.
            </p>
          ) : null}
        </>
      )}

      {erro ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-danger">
          <X className="size-4" aria-hidden />
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/** 5535999991234 → (35) 99999-1234. O DDI não interessa a quem lê. */
function formatarNumero(bruto: string): string {
  const d = bruto.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return bruto;
}
