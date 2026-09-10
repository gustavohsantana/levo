'use client';

import { useState, useTransition } from 'react';
import { Link2, LoaderCircle, MapPin } from 'lucide-react';
import {
  alternarAceiteAutomaticoAction,
  alternarCodigoDeEntregaAction,
  alternarRetiradaAction,
  salvarRegiaoAction,
} from '@/presentation/actions';
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
    requireDeliveryCode: boolean;
    pickupEnabled: boolean;
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-ink-muted">Dados da sua operação.</p>
      </div>

      {/*
        Duas colunas no desktop. Uma coluna só deixava a direita vazia e o
        dono rolando para achar o que já cabia na tela.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
      <section className="h-full rounded-lg bg-surface p-4 hairline">
        <h2 className="font-semibold text-ink">{establishment.name}</h2>
        <p className="mt-0.5 text-sm text-ink-faint">{establishment.address}</p>
      </section>

      {/*
        `contents` faz os dois cartões do form ocuparem a grade de fora, sem
        virar uma coluna só dentro do form.
      */}
      <form action={handleSubmit} className="contents">
      <section className="rounded-lg bg-surface p-4 hairline">
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

      <section className="rounded-lg bg-surface p-4 hairline">
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

      <Preferencias
        aceiteAutomatico={establishment.autoConfirmOrders}
        codigoDeEntrega={establishment.requireDeliveryCode}
        retirada={establishment.pickupEnabled}
      />

      <DeliveryFeeBands inicial={faixas} />
      </div>
    </div>
  );
}

/**
 * As preferências do pedido, num card só.
 *
 * Antes eram três cartões grandes — um interruptor cada, com dois ou três
 * parágrafos de explicação. Juntos ocupavam metade da tela de configurações.
 * Agora são três linhas com uma dica curta: fica o que faz e o único cuidado
 * que importa, o resto sai.
 */
function Preferencias({
  aceiteAutomatico,
  codigoDeEntrega,
  retirada,
}: {
  aceiteAutomatico: boolean;
  codigoDeEntrega: boolean;
  retirada: boolean;
}) {
  return (
    <section className="rounded-lg bg-surface p-4 hairline lg:col-span-2">
      <h2 className="text-sm font-semibold text-ink">Preferências do pedido</h2>

      <div className="mt-1">
        <LinhaToggle
          titulo="Aceitar pedidos automaticamente"
          hint="Aceita assim que chega e já manda pra cozinha — o iFood só dá 3 minutos. Desligue se costuma recusar por falta de item."
          inicial={aceiteAutomatico}
          acao={alternarAceiteAutomaticoAction}
        />
        <LinhaToggle
          titulo="Código de confirmação da entrega"
          hint="O cliente informa 4 dígitos ao entregador na porta, como prova. Avise a equipe antes de ligar."
          inicial={codigoDeEntrega}
          acao={alternarCodigoDeEntregaAction}
        />
        <LinhaToggle
          titulo="Retirada no balcão"
          hint="O cliente pode escolher buscar na loja — sem taxa, sem endereço e fora da rota."
          inicial={retirada}
          acao={alternarRetiradaAction}
        />
      </div>
    </section>
  );
}

/**
 * Uma linha de preferência: título, dica curta e o interruptor.
 *
 * Salva no clique, sem botão de confirmar — é um estado só, e um "Salvar" ao
 * lado faria o dono achar que já valeu quando ainda não valeu. Se a gravação
 * falha, o interruptor volta e o erro aparece na própria linha.
 */
function LinhaToggle({
  titulo,
  hint,
  inicial,
  acao,
}: {
  titulo: string;
  hint: string;
  inicial: boolean;
  acao: (ligado: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [ligado, setLigado] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function alternar() {
    const novo = !ligado;
    setLigado(novo);
    setErro(null);
    startTransition(async () => {
      const r = await acao(novo);
      if (!r.ok) {
        setLigado(!novo);
        setErro(r.error ?? 'Não foi possível salvar.');
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{hint}</p>
        {erro ? <p className="mt-1 text-xs text-danger">{erro}</p> : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={titulo}
        disabled={pendente}
        onClick={alternar}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          ligado ? 'bg-accent' : 'bg-raised hairline'
        }`}
      >
        <span
          className={`absolute top-0.5 grid size-5 place-items-center rounded-full bg-white shadow-sm transition-all ${
            ligado ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        >
          {pendente ? (
            <LoaderCircle className="size-3 animate-spin text-ink-faint" aria-hidden />
          ) : null}
        </span>
      </button>
    </div>
  );
}
