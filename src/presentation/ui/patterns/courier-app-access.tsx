'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, KeyRound, LoaderCircle } from 'lucide-react';
import { gerarAcessoMotoboyAction } from '@/presentation/courier-login';
import { Button } from '../primitives';

/**
 * Usuario e senha do app, na ficha do motoboy.
 *
 * A senha so aparece na hora em que e gerada. Depois disso o banco so tem o
 * hash — gerar de novo e o unico jeito de recuperar.
 */
export function CourierAppAccess({
  courierId,
  login,
}: {
  courierId: string;
  login: string | null;
}) {
  const [credencial, setCredencial] = useState<{ login: string; password: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, gerar] = useTransition();

  function gerarAcesso() {
    setErro(null);
    gerar(async () => {
      const r = await gerarAcessoMotoboyAction(courierId);
      if (r.ok) setCredencial({ login: r.login, password: r.password });
      else setErro(r.error);
    });
  }

  const usuario = credencial?.login ?? login;
  const texto = credencial
    ? `Levô Entregador\nUsuário: ${credencial.login}\nSenha: ${credencial.password}`
    : null;

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
            <KeyRound className="size-4" aria-hidden />
            Acesso ao app
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Ele entra no celular com usuário e senha. Sem isso o app abre numa
            tela pedindo o login.
          </p>
        </div>

        {usuario && !credencial ? (
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
            {usuario}
          </span>
        ) : null}
      </div>

      {credencial ? (
        <div className="mt-3">
          <p className="text-xs leading-relaxed text-ink-muted">
            Mande isto para ele agora. A senha não aparece de novo.
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-raised px-3 py-2 text-sm">
            <dt className="text-ink-faint">Usuário</dt>
            <dd className="font-medium text-ink">{credencial.login}</dd>
            <dt className="text-ink-faint">Senha</dt>
            <dd className="font-medium text-ink">{credencial.password}</dd>
          </dl>
          {texto ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={async () => {
                await navigator.clipboard.writeText(texto);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? <Check /> : <Copy />}
              {copiado ? 'Copiado' : 'Copiar para mandar'}
            </Button>
          ) : null}
        </div>
      ) : (
        <Button className="mt-3" variant="outline" onClick={gerarAcesso} disabled={gerando}>
          {gerando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {login ? 'Gerar senha nova' : 'Gerar usuário e senha'}
        </Button>
      )}

      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
    </section>
  );
}
