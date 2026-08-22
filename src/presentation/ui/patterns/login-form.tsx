'use client';

import { useActionState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { loginAction } from '@/presentation/actions';
import { Button, Field, Input } from '../primitives';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="voce@seunegocio.com.br"
        />
      </Field>

      <Field label="Senha">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      {state && !state.ok ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}
