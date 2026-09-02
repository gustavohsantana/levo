'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, LoaderCircle, Send } from 'lucide-react';
import { gerarConviteTelegramAction } from '@/presentation/courier-actions';
import { Button } from '../primitives';

/**
 * O convite do Telegram, na ficha do motoboy.
 *
 * Uma vez por motoboy, e nunca mais: depois que ele toca, toda rota chega
 * sozinha. É o oposto do WhatsApp, onde cada envio é uma aposta — aqui quem
 * autoriza é ele, e por isso ninguém é punido por enviar.
 */
export function CourierTelegram({
  courierId,
  conectado,
}: {
  courierId: string;
  conectado: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, gerar] = useTransition();

  function gerarConvite() {
    setErro(null);
    gerar(async () => {
      const r = await gerarConviteTelegramAction(courierId);
      if (r.ok) setLink(r.link);
      else setErro(r.error);
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
            <Send className="size-4" aria-hidden />
            Avisar pelo Telegram
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Ele recebe a rota assim que ela é planejada, com o link da tela dele.
          </p>
        </div>

        {conectado ? (
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
            Conectado
          </span>
        ) : null}
      </div>

      {conectado && !link ? (
        <p className="mt-3 text-xs text-ink-faint">
          Para trocar de aparelho ou de conta, gere um convite novo — o antigo para de valer.
        </p>
      ) : null}

      {link ? (
        <div className="mt-3">
          <p className="text-xs leading-relaxed text-ink-muted">
            Mande este link para ele. Ao tocar, o Telegram abre e ele confirma — uma vez só.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-raised px-2 py-1.5 text-xs text-ink">
              {link}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? <Check /> : <Copy />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          {/* O código morre no primeiro uso: quem receber encaminhado não entra. */}
          <p className="mt-2 text-xs text-ink-faint">
            Vale uma vez. Depois que ele confirmar, o link deixa de funcionar.
          </p>
        </div>
      ) : (
        <Button className="mt-3" variant="outline" onClick={gerarConvite} disabled={gerando}>
          {gerando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {conectado ? 'Gerar novo convite' : 'Gerar convite'}
        </Button>
      )}

      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
    </section>
  );
}
