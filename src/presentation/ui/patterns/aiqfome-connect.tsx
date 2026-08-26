'use client';

import { useState, useTransition } from 'react';
import { Check, Link2, LoaderCircle, Unlink } from 'lucide-react';
import { desconectarAiqfome, escolherLojaAiqfome } from '@/presentation/integration-actions';
import { Button } from '../primitives';

/**
 * Conectar o aiqfome.
 *
 * Mais curto que o do iFood, e por um motivo de plataforma: aqui o lojista é
 * redirecionado, consente e volta — não existe código para transcrever. Por
 * isso o começo é um `<a>` de verdade, e não um botão com ação: o cookie de
 * `state` que protege contra CSRF precisa viajar numa navegação de topo.
 */
interface Props {
  conectado: boolean;
  lojaAtual: { id: string; nome: string | null } | null;
  /** Preenchido só quando o consentimento liberou mais de uma loja. */
  lojas: Array<{ id: string; nome: string }>;
}

export function AiqfomeConnect({ conectado, lojaAtual, lojas }: Props) {
  const [pendente, startTransition] = useTransition();
  const [escolhendo, setEscolhendo] = useState(lojas.length > 1 && !lojaAtual?.id);

  if (!conectado) {
    return (
      <div className="rounded-lg bg-surface p-5 hairline">
        <h3 className="font-semibold text-ink">Conectar o aiqfome</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Os pedidos do aiqfome passam a entrar aqui automaticamente, sem digitação.
        </p>

        <Button asChild variant="primary" className="mt-4">
          <a href="/api/integrations/aiqfome/connect">
            <Link2 />
            Conectar aiqfome
          </a>
        </Button>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Você vai autorizar pelo ID Magalu. Use a mesma conta do painel da sua loja — com
          e-mails diferentes, a autorização completa mas nenhuma loja aparece.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-surface p-5 hairline">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
          <Check className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">aiqfome conectado</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {lojaAtual?.nome ? (
              <>
                Recebendo pedidos de <strong className="text-ink">{lojaAtual.nome}</strong>.
              </>
            ) : (
              'Conta conectada, mas nenhuma loja escolhida.'
            )}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={pendente}
          onClick={() => startTransition(async () => void (await desconectarAiqfome()))}
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : <Unlink />}
          Desconectar
        </Button>
      </div>

      {escolhendo || !lojaAtual?.id ? (
        lojas.length > 0 ? (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium text-ink">Qual loja recebe as entregas?</p>
            <ul className="mt-2 space-y-1.5">
              {lojas.map((loja) => (
                <li key={loja.id}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={pendente}
                    onClick={() =>
                      startTransition(async () => {
                        await escolherLojaAiqfome(loja.id);
                        setEscolhendo(false);
                      })
                    }
                  >
                    {loja.nome}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
