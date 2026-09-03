'use client';

import { useActionState, useState, useTransition } from 'react';
import { LoaderCircle, Trash2, UserPlus } from 'lucide-react';
import { criarAcessoAction, removerAcessoAction, type AcessoView } from '@/presentation/team';
import { Button, Field, Input } from '../primitives';

/**
 * Quem entra no painel desta loja.
 *
 * Existe porque a loja tinha exatamente um login, para sempre — o do cadastro.
 * Na prática isso é o dono passando a própria senha para o gerente e para quem
 * fica no caixa.
 */
export function Team({ acessos }: { acessos: AcessoView[] }) {
  const [abrindo, setAbrindo] = useState(false);
  const [state, action, pending] = useActionState(criarAcessoAction, null);
  const [erroAoRemover, setErroAoRemover] = useState<string | null>(null);
  const [removendo, remover] = useTransition();

  // Some assim que o servidor confirma, sem precisar recarregar a tela.
  const criado = state?.ok === true;
  if (criado && abrindo) setAbrindo(false);

  return (
    <section className="rounded-lg bg-surface p-5 hairline">
      <h2 className="text-sm font-semibold text-ink">Quem entra no painel</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Cada pessoa com o próprio acesso. Assim ninguém precisa dividir senha, e
        dá para tirar o acesso de quem sai sem trocar a de todo mundo.
      </p>

      <ul className="mt-4 flex flex-col gap-1">
        {acessos.map((acesso) => (
          <li
            key={acesso.id}
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-raised"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">
                {acesso.nome}
                {acesso.ehVoce ? <span className="text-ink-faint"> · você</span> : null}
              </span>
              <span className="block truncate text-xs text-ink-faint">{acesso.email}</span>
            </span>

            {/*
              Sem botão na própria conta: quem se remove sozinho tranca a loja
              para fora, e não existe tela para desfazer isso.
            */}
            {acesso.ehVoce ? null : (
              <button
                type="button"
                disabled={removendo}
                onClick={() =>
                  remover(async () => {
                    const r = await removerAcessoAction(acesso.id);
                    setErroAoRemover(r.ok ? null : r.error);
                  })
                }
                title={`Tirar o acesso de ${acesso.nome}`}
                className="shrink-0 rounded-md p-1.5 text-ink-faint transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {erroAoRemover ? (
        <p role="alert" className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {erroAoRemover}
        </p>
      ) : null}

      {abrindo ? (
        <form action={action} className="mt-4 flex flex-col gap-3 hairline-t pt-4">
          <Field label="Nome">
            <Input name="nome" required autoFocus placeholder="Maria" />
          </Field>

          <Field label="E-mail">
            <Input name="email" type="email" required placeholder="maria@seunegocio.com.br" />
          </Field>

          <Field label="Senha" hint="Ela pode trocar depois. No mínimo 8 caracteres.">
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>

          {state && !state.ok ? (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              Criar acesso
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAbrindo(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setAbrindo(true)}
        >
          <UserPlus className="size-4" aria-hidden />
          Dar acesso a mais alguém
        </Button>
      )}
    </section>
  );
}
