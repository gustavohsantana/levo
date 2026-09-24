'use client';

import { useState, useTransition } from 'react';
import { Check, ExternalLink, LoaderCircle, Link2, Unlink } from 'lucide-react';
import {
  concluirVinculacaoIfood,
  desconectarIfood,
  escolherLojaIfood,
  iniciarVinculacaoIfood,
} from '@/presentation/integration-actions';
import { Button, Field, Input } from '../primitives';
import { IntegracaoIndisponivel } from './integracao-indisponivel';

/**
 * Conectar o iFood sem terminal.
 *
 * O fluxo tem uma ida e volta que a plataforma impõe: o lojista digita um
 * código no Portal do Parceiro e traz de volta um código de autorização. Não dá
 * para automatizar — dá para tornar claro, que é o que esta tela faz.
 *
 * Cada passo aparece um de cada vez, com o anterior visível. Mostrar os três
 * juntos faria o dono ler tudo antes de agir e perder o código de dez minutos
 * no meio do caminho.
 */
interface Props {
  conectado: boolean;
  lojaAtual: { id: string; nome: string | null } | null;
  /** Falso quando o ambiente não tem o client id e o segredo do aplicativo. */
  disponivel: boolean;
}

export function IfoodConnect({ conectado, lojaAtual, disponivel }: Props) {
  const [pendente, startTransition] = useTransition();
  const [codigo, setCodigo] = useState<{ userCode: string; url: string; minutos: number } | null>(
    null,
  );
  const [lojas, setLojas] = useState<Array<{ id: string; nome: string }> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [autorizacao, setAutorizacao] = useState('');

  function gerarCodigo() {
    setErro(null);
    startTransition(async () => {
      const resultado = await iniciarVinculacaoIfood();
      if (resultado.ok) {
        setCodigo({
          userCode: resultado.userCode,
          url: resultado.verificationUrl,
          minutos: resultado.expiraEmMinutos,
        });
      } else {
        setErro(resultado.error);
      }
    });
  }

  function concluir() {
    setErro(null);
    startTransition(async () => {
      const resultado = await concluirVinculacaoIfood(autorizacao);
      if (resultado.ok) {
        setCodigo(null);
        setAutorizacao('');
        // Uma loja só já foi vinculada pela ação; várias exigem escolha.
        if (resultado.lojas.length > 1) setLojas(resultado.lojas);
      } else {
        setErro(resultado.error);
      }
    });
  }

  if (!disponivel && !conectado) {
    return <IntegracaoIndisponivel titulo="iFood" />;
  }

  if (conectado && !codigo) {
    return (
      <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
            <Check className="size-4" aria-hidden />
          </span>

          <div className="min-w-0">
            <h3 className="font-semibold text-ink">iFood conectado</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {/*
                O que decide a frase é o **id**, não o nome. O nome vem de
                `/merchants/{id}`, que responde 403 quando a loja não concedeu o
                módulo Merchant — e olhar para ele fazia a tela dizer "nenhuma
                loja escolhida" com a loja gravada e funcionando. Mostrar o id
                é feio; mentir sobre o estado da conexão é pior.
              */}
              {lojaAtual?.id ? (
                <>
                  Recebendo pedidos de{' '}
                  <strong className="text-ink">{lojaAtual.nome ?? lojaAtual.id}</strong>.
                </>
              ) : (
                'Conta conectada, mas nenhuma loja escolhida.'
              )}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-auto self-start pt-4"
          disabled={pendente}
          onClick={() => startTransition(async () => void (await desconectarIfood()))}
        >
          <Unlink />
          Desconectar
        </Button>

        {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
      <h3 className="font-semibold text-ink">Conectar o iFood</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Os pedidos aceitos no iFood passam a entrar aqui automaticamente, sem digitação.
      </p>

      {!codigo ? (
        <Button variant="primary" className="mt-4" disabled={pendente} onClick={gerarCodigo}>
          {pendente ? <LoaderCircle className="animate-spin" /> : <Link2 />}
          Gerar código de conexão
        </Button>
      ) : (
        <div className="mt-5 space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              1. Este é o seu código
            </p>
            <p className="numeric mt-2 text-3xl font-semibold tracking-tight text-ink">
              {codigo.userCode}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              vale por <span className="numeric">{codigo.minutos}</span> minutos
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              2. Informe no portal do iFood
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href={codigo.url} target="_blank" rel="noreferrer">
                Abrir o portal do iFood
                <ExternalLink />
              </a>
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              3. Cole aqui o código que o portal mostrar
            </p>
            <Field label="Código de autorização" error={erro ?? undefined}>
              <Input
                value={autorizacao}
                onChange={(evento) => setAutorizacao(evento.target.value)}
                placeholder="XXXX-XXXX"
                autoComplete="off"
              />
            </Field>

            <div className="mt-3 flex gap-2">
              <Button variant="primary" disabled={pendente || !autorizacao} onClick={concluir}>
                {pendente ? <LoaderCircle className="animate-spin" /> : <Check />}
                Concluir conexão
              </Button>
              <Button variant="ghost" disabled={pendente} onClick={() => setCodigo(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {lojas ? (
        <div className="mt-5 border-t pt-4">
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
                      await escolherLojaIfood(loja.id);
                      setLojas(null);
                    })
                  }
                >
                  {loja.nome}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {erro && !codigo ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
    </div>
  );
}
