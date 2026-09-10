'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, MapPin, Send } from 'lucide-react';
import { alternarLocalizacaoTelegramAction } from '@/presentation/actions';

/**
 * O bot do Telegram, na tela de integrações.
 *
 * O convite de cada motoboy fica na ficha dele — é lá que se pensa em uma
 * pessoa. Aqui ficam as decisões que valem para a loja inteira.
 */
export function TelegramConnect({
  bot,
  conectados,
  total,
  localizacao,
}: {
  bot: string | null;
  conectados: number;
  total: number;
  localizacao: boolean;
}) {
  const [ligado, setLigado] = useState(localizacao);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  return (
    <div className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Send className="size-4" aria-hidden />
            Telegram
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            A rota pronta chega pelo Telegram. Cada motoboy autoriza uma vez, na ficha dele.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            bot ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-ink-muted'
          }`}
        >
          {bot ? `@${bot}` : 'Não configurado'}
        </span>
      </div>

      {bot ? (
        <>
          <p className="mt-3 text-sm text-ink">
            <strong className="numeric">{conectados}</strong> de {total} entregadores
            conectados
          </p>

          <div className="mt-4 border-t pt-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <MapPin className="size-4" aria-hidden />
              Pedir localização ao vivo
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              O bot pede a posição do turno para você ver a moto no mapa. Quem decide
              compartilhar é ele — o bot pede, nunca liga sozinho.
            </p>

            <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={ligado}
                disabled={pendente}
                onChange={(e) => {
                  const novo = e.target.checked;
                  setLigado(novo);
                  setErro(null);
                  startTransition(async () => {
                    const r = await alternarLocalizacaoTelegramAction(novo);
                    if (!r.ok) {
                      setLigado(!novo);
                      setErro(r.error ?? 'Não foi possível salvar.');
                    }
                  });
                }}
              />
              {ligado ? 'Ligado' : 'Desligado'}
              {pendente ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            </label>
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Falta configurar o bot no servidor.
        </p>
      )}

      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
    </div>
  );
}
