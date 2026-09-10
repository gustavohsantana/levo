'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bike, CalendarDays, LoaderCircle, Pencil, Plus } from 'lucide-react';
import {
  alternarEntregadorAction,
  salvarEntregadorAction,
} from '@/presentation/courier-actions';
import type { CourierView, RotaNoMapa } from '@/presentation/queries';
import { CouriersMap } from './couriers-map';
import { Button, EmptyState, Field, Input } from '../primitives';

/**
 * Quem entrega.
 *
 * O cadastro é curto porque o que importa são duas coisas: o nome, para o dono
 * escolher na hora de despachar, e o telefone, que é por onde a rota chega.
 * Sem telefone o entregador existe e não recebe trabalho.
 */
export function Couriers({
  entregadores,
  loja,
  rotas,
}: {
  entregadores: CourierView[];
  /** Centro do mapa: é da loja que todo mundo sai. */
  loja: { lat: number; lng: number; nome: string } | null;
  rotas: RotaNoMapa[];
}) {
  const [editando, setEditando] = useState<CourierView | null>(null);
  const [criando, setCriando] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Entregadores</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Quem leva os pedidos, quanto cada um recebe, e onde estão agora.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditando(null);
            setCriando(true);
          }}
        >
          <Plus />
          Novo entregador
        </Button>
      </div>

      {loja ? <CouriersMap rotas={rotas} loja={loja} /> : null}

      {criando || editando ? (
        <CourierForm
          entregador={editando}
          onDone={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      ) : null}

      {entregadores.length === 0 && !criando ? (
        <EmptyState
          icon={Bike}
          title="Nenhum entregador cadastrado"
          description="Cadastre quem entrega para poder montar rotas e mandar o link pelo WhatsApp."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {entregadores.map((entregador) => (
            <CourierRow key={entregador.id} entregador={entregador} onEdit={setEditando} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CourierRow({
  entregador,
  onEdit,
}: {
  entregador: CourierView;
  onEdit: (c: CourierView) => void;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <li
      className={`flex flex-col rounded-lg bg-surface p-3 hairline ${
        entregador.active ? '' : 'opacity-55'
      }`}
    >
      <div className="min-w-0">
        <Link
          href={`/dashboard/entregadores/${entregador.id}`}
          className="truncate font-medium text-ink hover:underline"
        >
          {entregador.name}
        </Link>
        <p className="numeric truncate text-sm text-ink-faint">{entregador.phone}</p>
      </div>

      {entregador.busy ? (
        <span className="mt-2 w-fit rounded-xs bg-accent-soft px-2 py-0.5 text-xs text-accent-ink">
          em rota
        </span>
      ) : null}

      {/*
        O acordo aparece na própria linha.

        Antes ele vivia atrás de um botão chamado "Histórico" — que não mentia
        só no rótulo: quem procurava quanto paga a alguém não tinha motivo
        nenhum para clicar ali.
      */}
      <p className="mt-2 text-xs text-ink-faint">
        {entregador.pagamento ?? (
          <span className="text-amber-700">Acordo de pagamento não definido</span>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {/*
          Dois destinos diferentes, dois rótulos diferentes.

          "Abrir" leva à ficha — acordo de pagamento, Telegram, histórico. O
          lápis lá embaixo corrige nome e telefone sem sair da lista. Antes os
          dois eram o mesmo ícone, e nada dizia qual fazia o quê.
        */}
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/entregadores/${entregador.id}`}>
            <CalendarDays />
            Abrir
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={pendente || entregador.busy}
          title={entregador.busy ? 'Está numa rota agora' : undefined}
          onClick={() =>
            startTransition(
              async () => void (await alternarEntregadorAction(entregador.id, !entregador.active)),
            )
          }
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          {entregador.active ? 'Pausar' : 'Ativar'}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={`Nome e telefone de ${entregador.name}`}
          title="Nome e telefone"
          onClick={() => onEdit(entregador)}
        >
          <Pencil />
        </Button>
      </div>
    </li>
  );
}

function CourierForm({
  entregador,
  onDone,
}: {
  entregador: CourierView | null;
  onDone: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, submit] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    submit(async () => {
      const resultado = await salvarEntregadorAction(formData);
      if (resultado.ok) onDone();
      else setErro(resultado.error);
    });
  }

  return (
    <form action={handleSubmit} className="rounded-lg bg-surface p-5 hairline">
      <h2 className="font-semibold text-ink">
        {entregador ? 'Editar entregador' : 'Novo entregador'}
      </h2>

      <input type="hidden" name="id" value={entregador?.id ?? ''} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input name="name" defaultValue={entregador?.name ?? ''} autoFocus required />
        </Field>

        <Field label="WhatsApp" hint="é por onde a rota chega para ele">
          <Input
            name="phone"
            inputMode="tel"
            defaultValue={entregador?.phone ?? ''}
            placeholder="(35) 99999-9999"
            required
          />
        </Field>

        <Field
          label="Pedidos por viagem"
          hint="quanto cabe no baú dele — de carro cabe mais, de bicicleta bem menos"
        >
          <Input
            name="maxStops"
            type="number"
            inputMode="numeric"
            min={1}
            max={15}
            defaultValue={entregador?.maxStops ?? 15}
            required
          />
        </Field>
      </div>

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}

      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="primary" disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          Salvar
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pendente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
