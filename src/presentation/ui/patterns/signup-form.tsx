'use client';

import { useActionState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cadastrarAction } from '@/presentation/onboarding';
import { Button, Field, Input } from '../primitives';

/**
 * O cadastro da loja.
 *
 * Pede o mínimo que o sistema não consegue inventar: quem é a loja, onde ela
 * fica, e quem entra. Taxa de entrega, horário, cardápio e motoboys têm padrão e
 * se ajustam depois — formulário longo na primeira tela é onde o interessado
 * fecha a aba.
 *
 * A ordem é a da conversa real: primeiro o negócio, depois a pessoa. Perguntar a
 * senha antes de saber o nome da loja faz parecer cadastro de site qualquer.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState(cadastrarAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nome da loja">
        <Input
          name="nomeDaLoja"
          required
          autoFocus
          maxLength={60}
          placeholder="Pizzaria do Zé"
        />
      </Field>

      <Field
        label="Endereço da loja"
        hint="É de onde saem as entregas — o cálculo de rota e taxa parte daqui."
      >
        <Input
          name="endereco"
          required
          placeholder="Rua Comendador José Garcia, 100 - Centro"
        />
      </Field>

      {/* Cidade e estado separados: é o que impede o mapa de achar uma rua de
          mesmo nome do outro lado do país. */}
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Field label="Cidade">
          <Input name="cidade" required placeholder="Pouso Alegre" />
        </Field>
        <Field label="Estado">
          <Input name="estado" required maxLength={2} placeholder="MG" />
        </Field>
      </div>

      <div className="mt-2 hairline-t pt-4">
        <Field label="Seu nome">
          <Input name="nome" required placeholder="Zé" />
        </Field>
      </div>

      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="voce@seunegocio.com.br"
        />
      </Field>

      <Field label="Senha" hint="No mínimo 8 caracteres.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      {state && !state.ok ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Criar minha loja
      </Button>
    </form>
  );
}
