'use client';

import { useActionState, useState } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle, MapPin } from 'lucide-react';

const RouteMap = dynamic(() => import('./route-map').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-raised" />,
});
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
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

  /*
   * O mapa só aparece quando a busca por texto falha.
   *
   * Pedir confirmação do que já está certo é atrito puro, e ensina a pessoa a
   * clicar sem ler — aí, no dia em que a confirmação importa, ela clica sem ler
   * também.
   */
  const precisaDoMapa = Boolean(state && !state.ok && 'precisaDoMapa' in state);

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
        <p
          role="alert"
          className={`rounded-md px-3 py-2 text-xs ${
            precisaDoMapa ? 'bg-warning-soft text-ink' : 'bg-danger-soft text-danger'
          }`}
        >
          {state.error}
        </p>
      ) : null}

      {precisaDoMapa && state && !state.ok && 'centro' in state ? (
        <div>
          <div className="h-56 overflow-hidden rounded-md hairline">
            <RouteMap
              className="h-full w-full"
              center={state.centro}
              /* Não reenquadra depois do primeiro toque: o mapa fugiria do dedo. */
              autoFit={!pin}
              onPick={setPin}
              markers={pin ? [{ ...pin, label: 'Minha loja', kind: 'origin' }] : []}
            />
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {pin
              ? 'Ponto marcado. Confira e crie sua loja.'
              : 'Toque no mapa onde fica a sua loja.'}
          </p>

          {/* Vai junto no próximo envio; o servidor prefere o ponto ao texto. */}
          <input type="hidden" name="lat" value={pin?.lat ?? ''} />
          <input type="hidden" name="lng" value={pin?.lng ?? ''} />
        </div>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending || (precisaDoMapa && !pin)}
        className="mt-1"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        {precisaDoMapa && !pin ? 'Marque no mapa para continuar' : 'Criar minha loja'}
      </Button>
    </form>
  );
}
