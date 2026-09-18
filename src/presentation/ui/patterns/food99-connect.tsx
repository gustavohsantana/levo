'use client';

import { useState, useTransition } from 'react';
import { Check, ExternalLink, Link2, LoaderCircle, RefreshCw, Unlink } from 'lucide-react';
import {
  desconectarFood99,
  gerarLinkFood99,
  verificarVinculoFood99,
} from '@/presentation/integration-actions';
import { Button, Field, Input } from '../primitives';

/**
 * Conectar o 99Food.
 *
 * O fluxo é diferente dos outros dois de propósito, porque a plataforma é
 * diferente: ela não redireciona de volta nem devolve código nenhum. O lojista
 * autoriza numa página do 99Food e, do lado de cá, ninguém é avisado.
 *
 * Por isso a tela tem dois passos visíveis, e o segundo é um botão de conferir.
 * Fingir que "conectar" resolve sozinho deixaria o dono olhando para um cartão
 * que diz "conectado" sem que nada tenha sido autorizado — e o erro só
 * apareceria no primeiro pedido perdido.
 */
interface Props {
  conectado: boolean;
  /** O apelido da loja no Levô, que viaja como `app_shop_id`. */
  lojaAtual: string | null;
  /** `false` quando o ambiente não tem as credenciais do app. */
  disponivel: boolean;
}

export function Food99Connect({ conectado, lojaAtual, disponivel }: Props) {
  const [pendente, startTransition] = useTransition();
  const [apelido, setApelido] = useState(lojaAtual ?? 'lojaprincipal');
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!disponivel) {
    return (
      <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
        <h3 className="font-semibold text-ink">99Food</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Ainda não configurado neste ambiente. As credenciais do aplicativo precisam estar
          no servidor antes de vincular a loja.
        </p>
      </div>
    );
  }

  if (conectado) {
    return (
      <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
            <Check className="size-4" aria-hidden />
          </span>

          <div className="min-w-0">
            <h3 className="font-semibold text-ink">99Food conectado</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Recebendo pedidos como <strong className="text-ink">{lojaAtual}</strong>.
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-auto self-start pt-4"
          disabled={pendente}
          onClick={() =>
            startTransition(async () => {
              const r = await desconectarFood99();
              if (!r.ok) setErro(r.error ?? 'Não foi possível desconectar.');
            })
          }
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : <Unlink />}
          Desconectar
        </Button>

        {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
      <h3 className="font-semibold text-ink">Conectar o 99Food</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Os pedidos do 99Food passam a entrar aqui automaticamente, sem digitação.
      </p>

      <div className="mt-4">
        <Field
          label="Apelido da loja"
          hint="é por ele que o 99Food identifica esta loja — mantenha depois de conectar"
        >
          <Input
            value={apelido}
            onChange={(evento) => setApelido(evento.target.value)}
            placeholder="lojaprincipal"
            autoComplete="off"
          />
        </Field>
      </div>

      {/*
        O link aparece só depois de pedido, mas verificar está SEMPRE disponível.
        Prender o "verificar" atrás de gerar um link obrigava quem já autorizou —
        ou quem só está reconectando depois de a autorização vencer — a gerar um
        link que não vai usar. Aconteceu no primeiro teste real desta tela.
      */}
      {url ? (
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              Abrir a autorização no 99Food
              <ExternalLink />
            </a>
          </Button>
          {/*
            O link carrega assinatura e horário: ele vence. Sem dizer isso, o
            lojista que voltasse no dia seguinte veria um erro sem explicação.
          */}
          <p className="mt-2 text-xs text-ink-faint">
            O link vale por pouco tempo. Autorize e volte para confirmar.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={pendente || !apelido.trim()}
          onClick={() =>
            startTransition(async () => {
              setErro(null);
              const r = await verificarVinculoFood99(apelido);
              if (!r.ok) setErro(r.error ?? 'Ainda não foi possível confirmar.');
            })
          }
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : <Check />}
          Verificar conexão
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={pendente || !apelido.trim()}
          onClick={() =>
            startTransition(async () => {
              setErro(null);
              const r = await gerarLinkFood99(apelido);
              if (r.ok) setUrl(r.url);
              else setErro(r.error);
            })
          }
        >
          {url ? <RefreshCw /> : <Link2 />}
          {url ? 'Gerar outro link' : 'Preciso autorizar'}
        </Button>
      </div>

      {!url ? (
        <p className="mt-2 text-xs text-ink-faint">
          Se a loja já foi autorizada no 99Food, é só verificar.
        </p>
      ) : null}

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
    </div>
  );
}
