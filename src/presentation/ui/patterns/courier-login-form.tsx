'use client';

import { useActionState, useEffect, type CSSProperties } from 'react';
import { courierLoginAction } from '@/presentation/courier-login';

export function CourierLoginForm() {
  const [state, action, pending] = useActionState(courierLoginAction, null);

  useEffect(() => {
    if (state?.ok) window.location.assign('/entregador');
  }, [state]);

  return (
    <form action={action} style={formulario}>
      <label style={campo}>
        <span style={rotulo}>Usuário</span>
        <input
          name="login"
          autoComplete="username"
          required
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="jefferson"
          style={input}
        />
      </label>

      <label style={campo}>
        <span style={rotulo}>Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          style={input}
        />
      </label>

      {state && !state.ok ? (
        <p role="alert" style={erro}>
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} style={botao}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

const formulario: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: '100%',
};

const campo: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: '100%',
};

const rotulo: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#6b675f',
};

const input: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 7,
  border: '1px solid #e2ded6',
  background: '#fff',
  color: '#1c1917',
  fontSize: 16,
  fontFamily: 'inherit',
};

const erro: CSSProperties = {
  margin: 0,
  padding: '8px 12px',
  borderRadius: 7,
  background: '#fde8e6',
  color: '#b42318',
  fontSize: 12,
};

const botao: CSSProperties = {
  boxSizing: 'border-box',
  marginTop: 4,
  width: '100%',
  height: 44,
  border: 0,
  borderRadius: 7,
  background: '#8fd12f',
  color: '#1b2708',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
