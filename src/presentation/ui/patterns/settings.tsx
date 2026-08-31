'use client';

import { useState, useTransition } from 'react';
import { Link2, LoaderCircle, MapPin } from 'lucide-react';
import { alternarAceiteAutomaticoAction, salvarRegiaoAction } from '@/presentation/actions';
import { DeliveryFeeBands, type Faixa } from './delivery-fee-bands';
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
  faixas,
}: {
  faixas: Faixa[];
  establishment: {
    name: string;
    address: string;
    city: string | null;
    state: string | null;
    deliveryFeeReais: number;
    slug: string | null;
    autoConfirmOrders: boolean;
    baseUrl: string;
  };
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

      <form action={handleSubmit} className="flex flex-col gap-5">
      <section className="rounded-lg bg-surface p-5 hairline">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
            <Link2 className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Seu cardápio na internet</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Mande esse link no Instagram e no WhatsApp. O cliente monta o pedido e ele
              entra aqui direto, sem comissão de marketplace.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Endereço do cardápio">
            <div className="flex items-center gap-1">
              <span className="shrink-0 text-sm text-ink-faint">
                {establishment.baseUrl.replace(/^https?:\/\//, '')}/cardapio/
              </span>
              <Input name="slug" defaultValue={establishment.slug ?? ''} required />
            </div>
          </Field>

          {establishment.slug ? (
            <a
              href={`/cardapio/${establishment.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-accent-ink hover:underline"
            >
              Abrir o cardápio →
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg bg-surface p-5 hairline">
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

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_7rem_9rem]">
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

          <Field label="Taxa de entrega" hint="sugerida no pedido">
            <Input
              name="deliveryFeeReais"
              inputMode="decimal"
              defaultValue={establishment.deliveryFeeReais.toFixed(2)}
              placeholder="0,00"
            />
          </Field>
        </div>

        {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
        {salvo ? <p className="mt-3 text-sm text-accent-ink">Salvo.</p> : null}

        <Button type="submit" variant="primary" className="mt-4" disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          Salvar
        </Button>
      </section>
      </form>

      <AceiteAutomatico inicial={establishment.autoConfirmOrders} />

      <DeliveryFeeBands inicial={faixas} />
    </div>
  );
}

/**
 * O interruptor do aceite automático.
 *
 * Salva no clique, sem botão de confirmar: é um estado só, e um "Salvar" ao
 * lado de um interruptor faz o dono achar que já valeu quando ainda não valeu.
 */
function AceiteAutomatico({ inicial }: { inicial: boolean }) {
  const [ligado, setLigado] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  return (
    <section className="rounded-lg bg-surface p-5 hairline">
      <h2 className="text-sm font-semibold text-ink">Aceitar pedidos automaticamente</h2>

      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        O iFood dá <strong className="text-ink">3 minutos</strong> para você aceitar cada pedido e
        piora sua posição na plataforma quando passa disso — prazo difícil de cumprir com a cozinha
        cheia. Com isto ligado, o pedido é aceito assim que chega e já entra na fila de preparo.
      </p>

      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        Aceitar é um compromisso: o pedido vai sair. Se você costuma recusar por falta de item ou
        por estar fora da área, deixe desligado e aceite na mão.
      </p>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={ligado}
          disabled={pendente}
          onChange={(evento) => {
            const novo = evento.target.checked;
            setLigado(novo);
            setErro(null);
            startTransition(async () => {
              const r = await alternarAceiteAutomaticoAction(novo);
              if (!r.ok) {
                setLigado(!novo);
                setErro(r.error ?? 'Não foi possível salvar.');
              }
            });
          }}
        />
        {ligado ? 'Ligado' : 'Desligado'}
        {pendente ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      </label>

      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
    </section>
  );
}
