'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, MapPin } from 'lucide-react';
import { salvarRegiaoAction } from '@/presentation/actions';
import { Button, Field, Input } from '../primitives';

/**
 * Onde o estabelecimento opera.
 *
 * Parece detalhe de cadastro e não é: cidade e estado entram em **toda** busca
 * de endereço. Sem eles o geocodificador procura no país inteiro, e "Rua das
 * Flores, 100" casa com a primeira rua homônima que aparecer — pino válido, no
 * estado errado, rota inteira arruinada.
 */
export function Settings({
  establishment,
}: {
  establishment: { name: string; address: string; city: string | null; state: string | null };
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, submit] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    setSalvo(false);

    submit(async () => {
      const resultado = await salvarRegiaoAction(formData);
      if (resultado.ok) setSalvo(true);
      else setErro(resultado.error);
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-ink-muted">Dados da sua operação.</p>
      </div>

      <section className="rounded-lg bg-surface p-5 hairline">
        <h2 className="font-semibold text-ink">{establishment.name}</h2>
        <p className="mt-0.5 text-sm text-ink-faint">{establishment.address}</p>
      </section>

      <form action={handleSubmit} className="rounded-lg bg-surface p-5 hairline">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
            <MapPin className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Onde você entrega</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Usado para localizar o endereço de cada pedido. Com isso preenchido, quem
              lança o pedido não precisa escrever a cidade toda vez.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_7rem]">
          <Field label="Cidade">
            <Input name="city" defaultValue={establishment.city ?? ''} required />
          </Field>

          <Field label="Estado" hint="sigla">
            <Input
              name="state"
              defaultValue={establishment.state ?? ''}
              maxLength={2}
              placeholder="MG"
              required
            />
          </Field>
        </div>

        {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
        {salvo ? <p className="mt-3 text-sm text-accent-ink">Salvo.</p> : null}

        <Button type="submit" variant="primary" className="mt-4" disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          Salvar
        </Button>
      </form>
    </div>
  );
}
