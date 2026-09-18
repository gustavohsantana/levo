'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Pause, Play, Power } from 'lucide-react';
import type { LojaAiqfomeView } from '@/presentation/queries';
import {
  abrirLojaAiqfomeAction,
  definirHorariosAiqfomeAction,
  fecharLojaAiqfomeAction,
  pausarLojaAiqfomeAction,
} from '@/presentation/actions';
import { Button, Input } from '../primitives';

/**
 * 1=segunda … 7=domingo — a numeração de `week_day_number` do aiqfome.
 * `nome` é o `week_day_name` que o POST de horário exige (string sem acento).
 */
const DIAS: Array<{ num: number; label: string; nome: string }> = [
  { num: 1, label: 'Segunda', nome: 'segunda' },
  { num: 2, label: 'Terça', nome: 'terca' },
  { num: 3, label: 'Quarta', nome: 'quarta' },
  { num: 4, label: 'Quinta', nome: 'quinta' },
  { num: 5, label: 'Sexta', nome: 'sexta' },
  { num: 6, label: 'Sábado', nome: 'sabado' },
  { num: 7, label: 'Domingo', nome: 'domingo' },
];

/**
 * A loja no aiqfome, gerida de dentro do Levô — paridade com a tela do iFood.
 *
 * Três blocos: o que a loja é; a disponibilidade (toggle abrir/pausar/fechar,
 * pois o aiqfome não tem pausa datada); e o horário de funcionamento. O que
 * muda aqui reflete no painel do aiqfome.
 */
export function AiqfomeLoja({ loja }: { loja: LojaAiqfomeView }) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">aiqfome — sua loja</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Disponibilidade e horário, direto pelo Levô. O que muda aqui reflete no aiqfome.
        </p>
      </div>

      <InfoLoja loja={loja} />
      <Disponibilidade />
      <Horarios loja={loja} />
    </div>
  );
}

/** Cenário 1: informações da loja. */
function InfoLoja({ loja }: { loja: LojaAiqfomeView }) {
  const d = loja.detalhes;
  const linhas: Array<[string, string]> = [
    ['Nome', String(d.name ?? loja.nome)],
    ['CNPJ', String(d.document_number ?? '—')],
    ['Tempo de preparo', d.time_to_prepare_order ? `${d.time_to_prepare_order} min` : '—'],
    ['Tempo de entrega', d.time_to_deliver ? `${d.time_to_deliver} min` : '—'],
    ['ID no aiqfome', loja.storeId],
  ];

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <h2 className="text-sm font-semibold text-ink">Informações da loja</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {linhas.map(([rot, val]) => (
          <div key={rot} className="flex justify-between gap-3 text-sm">
            <dt className="text-ink-faint">{rot}</dt>
            <dd className="min-w-0 truncate text-right text-ink">{val}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Cenário 2: disponibilidade — abrir / pausar / fechar. */
function Disponibilidade() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [pendente, submit] = useTransition();

  function acionar(rotulo: string, acao: () => Promise<{ ok: boolean; error?: string }>) {
    setErro(null);
    setFeito(null);
    submit(async () => {
      const r = await acao();
      if (r.ok) {
        setFeito(rotulo);
        router.refresh();
      } else setErro(r.error ?? 'Falhou.');
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <h2 className="text-sm font-semibold text-ink">Disponibilidade</h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Abrir volta a receber pedido; pausar deixa a loja em espera; fechar tira do ar até reabrir.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => acionar('aberta', abrirLojaAiqfomeAction)}
          disabled={pendente}
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : <Play />}
          Reabrir
        </Button>
        <Button
          variant="outline"
          onClick={() => acionar('pausada', pausarLojaAiqfomeAction)}
          disabled={pendente}
        >
          <Pause />
          Pausar
        </Button>
        <Button
          variant="neutral"
          onClick={() => acionar('fechada', fecharLojaAiqfomeAction)}
          disabled={pendente}
        >
          <Power />
          Fechar
        </Button>
      </div>

      {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
      {feito ? <p className="mt-2 text-sm text-accent-ink">Loja {feito} no aiqfome.</p> : null}
    </section>
  );
}

/** Cenário 3: horário de funcionamento — uma faixa por dia. */
function Horarios({ loja }: { loja: LojaAiqfomeView }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, submit] = useTransition();
  const [porDia, setPorDia] = useState<Record<number, DiaEditor>>(() => doHorario(loja.horarios));

  /*
   * Recarrega o editor quando a agenda que veio do servidor muda de verdade
   * (ex.: editada no painel do aiqfome). Comparar por assinatura evita
   * sobrescrever edição em andamento — mesmo cuidado da tela do iFood.
   */
  const assinaturaServidor = JSON.stringify(loja.horarios);
  const ultimaAssinatura = useRef(assinaturaServidor);
  useEffect(() => {
    if (assinaturaServidor !== ultimaAssinatura.current) {
      ultimaAssinatura.current = assinaturaServidor;
      setPorDia(doHorario(loja.horarios));
    }
  }, [assinaturaServidor, loja.horarios]);

  function mudar(num: number, patch: Partial<DiaEditor>) {
    setPorDia((a) => ({ ...a, [num]: { ...a[num], ...patch } }));
    setSalvo(false);
  }

  function salvar() {
    setErro(null);
    setSalvo(false);
    const dias = DIAS.map((dia) => ({ ...dia, ...porDia[dia.num] }));
    const invalido = dias.find((d) => d.aberto && d.inicio >= d.fim);
    if (invalido) {
      setErro('Tem dia aberto com fim antes do início.');
      return;
    }
    /*
     * O POST de horário do aiqfome exige um formato próprio (diferente da
     * leitura): `week_day_name` e `hours` como objeto `{ first_period }`.
     */
    const payload = dias.map((d) => ({
      week_day_number: d.num,
      week_day_name: d.nome,
      status: d.aberto ? 1 : 0,
      hours: { first_period: `${d.inicio} - ${d.fim}` },
    }));
    submit(async () => {
      const r = await definirHorariosAiqfomeAction(payload);
      if (r.ok) {
        setSalvo(true);
        router.refresh();
      } else setErro(r.error);
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <h2 className="text-sm font-semibold text-ink">Horário de funcionamento</h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Salvar envia os sete dias de uma vez. Dia desmarcado fica fechado no aiqfome.
      </p>

      <div className="mt-3 flex flex-col divide-y">
        {DIAS.map(({ num, label }) => {
          const dia = porDia[num];
          return (
            <div key={num} className="flex items-center gap-3 py-2.5">
              <label className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={dia.aberto}
                  onChange={(e) => mudar(num, { aberto: e.target.checked })}
                  className="size-4 accent-[var(--accent)]"
                />
                {label}
              </label>
              {dia.aberto ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={dia.inicio}
                    onChange={(e) => mudar(num, { inicio: e.target.value })}
                    className="h-8 w-28 text-sm"
                  />
                  <span className="text-ink-faint">–</span>
                  <Input
                    type="time"
                    value={dia.fim}
                    onChange={(e) => mudar(num, { fim: e.target.value })}
                    className="h-8 w-28 text-sm"
                  />
                </div>
              ) : (
                <span className="py-1.5 text-xs text-ink-faint">Fechado</span>
              )}
            </div>
          );
        })}
      </div>

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
      {salvo ? <p className="mt-3 text-sm text-accent-ink">Horário salvo no aiqfome.</p> : null}
      <Button variant="primary" className="mt-3" onClick={salvar} disabled={pendente}>
        {pendente ? <LoaderCircle className="animate-spin" /> : null}
        Salvar horário
      </Button>
    </section>
  );
}

interface DiaEditor {
  num: number;
  aberto: boolean;
  inicio: string;
  fim: string;
}

/**
 * A agenda do aiqfome (faixa "HH:MM - HH:MM" por dia) → o editor.
 *
 * Dia ausente na resposta, ou com status 0, entra como fechado. A faixa
 * "00:00 - 23:59" (24h) vira o par início/fim direto.
 */
function doHorario(horarios: LojaAiqfomeView['horarios']): Record<number, DiaEditor> {
  const porDia: Record<number, DiaEditor> = {};
  for (const { num } of DIAS) {
    porDia[num] = { num, aberto: false, inicio: '09:00', fim: '18:00' };
  }
  for (const h of horarios) {
    const [inicio, fim] = h.hours.split('-').map((s) => s.trim());
    porDia[h.week_day_number] = {
      num: h.week_day_number,
      aberto: h.status === 1,
      inicio: inicio || '09:00',
      fim: fim || '18:00',
    };
  }
  return porDia;
}
