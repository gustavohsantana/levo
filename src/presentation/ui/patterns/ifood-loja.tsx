'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { LojaIfoodView } from '@/presentation/queries';
import {
  criarPausaIfoodAction,
  definirHorariosIfoodAction,
  removerPausaIfoodAction,
} from '@/presentation/actions';
import { Button, Field, Input } from '../primitives';

const DIAS: Array<{ key: string; label: string }> = [
  { key: 'MONDAY', label: 'Segunda' },
  { key: 'TUESDAY', label: 'Terça' },
  { key: 'WEDNESDAY', label: 'Quarta' },
  { key: 'THURSDAY', label: 'Quinta' },
  { key: 'FRIDAY', label: 'Sexta' },
  { key: 'SATURDAY', label: 'Sábado' },
  { key: 'SUNDAY', label: 'Domingo' },
];

/**
 * A loja no iFood, gerida de dentro do Levô — a tela da homologação Merchant.
 *
 * Três blocos, um por cenário: o que a loja é e se está disponível; as pausas;
 * e o horário de funcionamento. Cada ação chama a API do iFood e reflete no
 * Portal do Parceiro — é o que a homologação pede para provar.
 */
export function IfoodLoja({ loja, agoraInicial }: { loja: LojaIfoodView; agoraInicial: number }) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">iFood — sua loja</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pausa, horário e disponibilidade, direto pelo Levô. O que muda aqui reflete no iFood.
        </p>
      </div>

      <InfoLoja loja={loja} />
      <Pausas loja={loja} agoraInicial={agoraInicial} />
      <Horarios loja={loja} />
    </div>
  );
}

/** Cenário 1: informações da loja + disponibilidade. */
function InfoLoja({ loja }: { loja: LojaIfoodView }) {
  const d = loja.detalhes;
  const linhas: Array<[string, string]> = [
    ['Nome', String(d.name ?? loja.nome)],
    ['Razão social', String(d.corporateName ?? '—')],
    ['Tipo', String(d.type ?? '—')],
    ['ID no iFood', loja.merchantId],
  ];

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Informações da loja</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            loja.disponivel ? 'bg-accent-soft text-accent-ink' : 'bg-danger-soft text-danger'
          }`}
        >
          {loja.disponivel ? 'Disponível' : 'Indisponível'}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {linhas.map(([rot, val]) => (
          <div key={rot} className="flex justify-between gap-3 text-sm">
            <dt className="text-ink-faint">{rot}</dt>
            <dd className="min-w-0 truncate text-right text-ink">{val}</dd>
          </div>
        ))}
      </dl>

      {loja.validacoes.length > 0 ? (
        <div className="mt-3 border-t pt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Disponibilidade
          </p>
          <ul className="flex flex-col gap-1">
            {loja.validacoes.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-sm text-ink">
                {v.ok ? (
                  <Check className="size-4 shrink-0 text-accent-ink" aria-hidden />
                ) : (
                  <X className="size-4 shrink-0 text-danger" aria-hidden />
                )}
                {v.titulo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Cenário 2: interrupções (pausas). */
function Pausas({ loja, agoraInicial }: { loja: LojaIfoodView; agoraInicial: number }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, submit] = useTransition();
  const [descricao, setDescricao] = useState('Pausa pelo Levô');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  /*
   * A lista de pausas do iFood é eventualmente consistente: criar devolve 200 na
   * hora, mas a pausa só aparece no `listarPausas` alguns segundos depois. Sem
   * isto, o lojista cria, o refresh relê a lista ainda sem ela, e a tela diz
   * "nenhuma pausa" — parece que falhou. Guardamos a recém-criada aqui e a
   * mostramos junto, como PONTE, até a lista do servidor alcançá-la.
   */
  type Otimista = LojaIfoodView['pausas'][number] & { criadaEm: number };
  const [otimistas, setOtimistas] = useState<Otimista[]>([]);
  const [removidas, setRemovidas] = useState<string[]>([]);
  const idsDoServidor = loja.pausas.map((p) => p.id);
  const chaveServidor = [...idsDoServidor].sort().join(',');

  /*
   * Descarta a cópia otimista assim que o servidor CONFIRMA a criação (o id
   * entrou na lista). Sem isto, uma pausa criada no Levô e depois excluída pelo
   * Portal voltaria a aparecer: ela sumia da tela só enquanto estava na lista do
   * servidor, e ao ser excluída lá fora a ponte otimista a ressuscitava.
   *
   * O ajuste acontece no render, e não num efeito: o React pede para o estado
   * acompanhar a prop na hora em que ela muda, em vez de disparar um setState
   * depois da pintura.
   */
  const [chaveVista, setChaveVista] = useState(chaveServidor);
  if (chaveServidor !== chaveVista) {
    setChaveVista(chaveServidor);
    setOtimistas((a) => a.filter((p) => !idsDoServidor.includes(p.id)));
  }

  const agora = useAgora(agoraInicial);
  // A ponte vale por pouco tempo: se em 15s o servidor não confirmou (ex.: a
  // pausa foi excluída antes de propagar), paramos de mostrá-la e confiamos no
  // servidor. Uma vez confirmada, o ajuste acima já a tirou da lista local.
  const otimistasVisiveis = otimistas.filter(
    (p) => !idsDoServidor.includes(p.id) && agora - p.criadaEm < 15_000,
  );
  const pausas = [...loja.pausas, ...otimistasVisiveis]
    .filter((p) => !removidas.includes(p.id))
    // Pausa vencida não é "ativa" — e a lista do iFood ainda a devolve por um
    // tempo depois do fim. Escondê-la evita mostrar como atual algo que já passou.
    .filter((p) => instante(p.end) > agora)
    .sort((a, b) => instante(a.start) - instante(b.start));

  /*
   * A lista do iFood é eventualmente consistente: depois de criar ou remover, ela
   * leva alguns segundos para refletir. Uma releitura única logo após a ação pega
   * a lista defasada. Reler mais duas vezes, espaçado, deixa a tela alcançar o
   * estado real sozinha — sem o lojista precisar dar F5.
   */
  function relerAteAlcancar() {
    router.refresh();
    setTimeout(() => router.refresh(), 3000);
    setTimeout(() => router.refresh(), 7000);
  }

  function criar() {
    setErro(null);
    if (!inicio || !fim) {
      setErro('Preencha início e fim.');
      return;
    }
    submit(async () => {
      const r = await criarPausaIfoodAction(
        descricao,
        new Date(inicio).toISOString(),
        new Date(fim).toISOString(),
      );
      if (r.ok) {
        if (r.pausa) setOtimistas((a) => [...a, { ...r.pausa!, criadaEm: Date.now() }]);
        setInicio('');
        setFim('');
        relerAteAlcancar();
      } else setErro(r.error);
    });
  }

  function remover(id: string) {
    setErro(null);
    submit(async () => {
      const r = await removerPausaIfoodAction(id);
      if (r.ok) {
        setRemovidas((a) => [...a, id]);
        setOtimistas((a) => a.filter((p) => p.id !== id));
        relerAteAlcancar();
      } else setErro(r.error);
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Pausas na loja</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Fecha a loja por uma janela de tempo. Some sozinha quando o fim chega.
          </p>
        </div>
        <button
          type="button"
          onClick={() => submit(() => router.refresh())}
          disabled={pendente}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${pendente ? 'animate-spin' : ''}`} aria-hidden />
          Atualizar
        </button>
      </div>

      <ul className="mt-3 flex flex-col divide-y">
        {pausas.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{p.description}</p>
              <p className="text-xs text-ink-faint">
                {quando(p.start)} → {quando(p.end)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remover(p.id)}
              disabled={pendente}
              aria-label="Remover pausa"
              className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-raised hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {pausas.length === 0 ? (
          <li className="py-2 text-sm text-ink-faint">Nenhuma pausa ativa.</li>
        ) : null}
      </ul>

      <div className="mt-3 border-t pt-3">
        <Field label="Descrição">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Field>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="Início">
            <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
          </Field>
        </div>
        {erro ? <p className="mt-2 text-sm text-danger">{erro}</p> : null}
        <Button variant="primary" className="mt-3" onClick={criar} disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : <Plus />}
          Criar pausa
        </Button>
        <p className="mt-2 text-xs text-ink-faint">
          A pausa aparece aqui na hora; no iFood pode levar alguns segundos para refletir.
        </p>
      </div>
    </section>
  );
}

/** Cenário 3: horário de funcionamento. */
function Horarios({ loja }: { loja: LojaIfoodView }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, submit] = useTransition();
  const [porDia, setPorDia] = useState<Record<string, Array<{ inicio: string; fim: string }>>>(() =>
    doHorario(loja.horarios),
  );

  /*
   * O editor carrega a agenda uma vez, no `useState`. Se o horário mudar no
   * iFood (ex.: editado pelo Portal) e o servidor reler, o `useState` não roda
   * o inicializador de novo — o editor ficaria preso na agenda antiga. Aqui,
   * quando a agenda que veio do servidor de fato muda, recarregamos o editor.
   * Comparamos por assinatura para não sobrescrever edição em andamento: só as
   * mudanças vindas do iFood mexem na assinatura do servidor.
   */
  const assinaturaServidor = JSON.stringify(loja.horarios);
  const ultimaAssinatura = useRef(assinaturaServidor);
  useEffect(() => {
    if (assinaturaServidor !== ultimaAssinatura.current) {
      ultimaAssinatura.current = assinaturaServidor;
      setPorDia(doHorario(loja.horarios));
    }
  }, [assinaturaServidor, loja.horarios]);

  function atualizar() {
    setSalvo(false);
    submit(() => router.refresh());
  }

  function addTurno(dia: string) {
    setPorDia((a) => ({ ...a, [dia]: [...(a[dia] ?? []), { inicio: '09:00', fim: '18:00' }] }));
  }
  function mudarTurno(dia: string, i: number, campo: 'inicio' | 'fim', valor: string) {
    setPorDia((a) => ({
      ...a,
      [dia]: a[dia].map((t, j) => (j === i ? { ...t, [campo]: valor } : t)),
    }));
  }
  function removerTurno(dia: string, i: number) {
    setPorDia((a) => ({ ...a, [dia]: a[dia].filter((_, j) => j !== i) }));
  }

  function salvar() {
    setErro(null);
    setSalvo(false);
    const shifts = paraShifts(porDia);
    const invalido = shifts.find((s) => s.duration <= 0);
    if (invalido) {
      setErro('Tem turno com fim antes do início.');
      return;
    }
    submit(async () => {
      const r = await definirHorariosIfoodAction(shifts);
      if (r.ok) {
        setSalvo(true);
        router.refresh();
      } else setErro(r.error);
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Horário de funcionamento</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Salvar substitui a agenda inteira no iFood — dia sem turno fica fechado.
          </p>
        </div>
        <button
          type="button"
          onClick={atualizar}
          disabled={pendente}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${pendente ? 'animate-spin' : ''}`} aria-hidden />
          Atualizar
        </button>
      </div>

      <div className="mt-3 flex flex-col divide-y">
        {DIAS.map((dia) => {
          const turnos = porDia[dia.key] ?? [];
          return (
            <div key={dia.key} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start">
              <span className="w-20 shrink-0 pt-1.5 text-sm font-medium text-ink">{dia.label}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {turnos.length === 0 ? (
                  <span className="py-1.5 text-xs text-ink-faint">Fechado</span>
                ) : null}
                {turnos.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      value={t.inicio}
                      onChange={(e) => mudarTurno(dia.key, i, 'inicio', e.target.value)}
                      className="h-8 w-28 text-sm"
                    />
                    <span className="text-ink-faint">–</span>
                    <Input
                      type="time"
                      value={t.fim}
                      onChange={(e) => mudarTurno(dia.key, i, 'fim', e.target.value)}
                      className="h-8 w-28 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removerTurno(dia.key, i)}
                      aria-label="Remover turno"
                      className="rounded p-1 text-ink-faint hover:bg-raised hover:text-danger"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addTurno(dia.key)}
                  className="flex w-fit items-center gap-1 text-xs text-accent-ink hover:underline"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Adicionar turno
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
      {salvo ? <p className="mt-3 text-sm text-accent-ink">Horário salvo no iFood.</p> : null}
      <Button variant="primary" className="mt-3" onClick={salvar} disabled={pendente}>
        {pendente ? <LoaderCircle className="animate-spin" /> : null}
        Salvar horário
      </Button>
    </section>
  );
}

/**
 * ISO → "10/09 14:00" (fuso de Brasília).
 *
 * O iFood devolve o instante em UTC mas SEM o `Z` (ex.: "2026-09-11T23:00:00").
 * Sem o sufixo, `new Date` interpreta como hora local do navegador — e a pausa
 * que o lojista marcou às 20:00 aparece como 23:00. Forçamos a leitura em UTC e
 * só então convertemos para Brasília, para bater com o que ele digitou e com o
 * que o Portal do iFood mostra.
 */
function quando(iso: string): string {
  const d = new Date(instante(iso) - 180 * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Hora atual sem chamar `Date.now()` no render.
 *
 * O primeiro valor vem do servidor, o mesmo na hidratação. O intervalo só
 * corre depois, para a pausa vencida e a ponte otimista de 15s saírem sozinhas.
 */
function useAgora(inicial: number): number {
  const [agora, setAgora] = useState(inicial);
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

/**
 * O instante em ms de um horário do iFood.
 *
 * Ele devolve UTC mas às vezes sem o `Z` (ex.: "2026-09-11T23:00:00"). Sem o
 * sufixo, `new Date` leria como hora local do navegador — deslocando tudo pelo
 * fuso. Forçamos a leitura em UTC.
 */
function instante(iso: string): number {
  const utc = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  return new Date(utc).getTime();
}

/** Os shifts do iFood (dia, início, duração) → o editor (por dia, início/fim). */
function doHorario(
  horarios: LojaIfoodView['horarios'],
): Record<string, Array<{ inicio: string; fim: string }>> {
  const porDia: Record<string, Array<{ inicio: string; fim: string }>> = {};
  for (const s of horarios) {
    const [h, m] = s.start.split(':').map(Number);
    const iniMin = h * 60 + m;
    const fimMin = iniMin + s.duration;
    const hhmm = (min: number) =>
      `${String(Math.floor((min % 1440) / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    (porDia[s.dayOfWeek] ??= []).push({ inicio: hhmm(iniMin), fim: hhmm(fimMin) });
  }
  return porDia;
}

/** O editor → os shifts do iFood: "HH:MM:00" e duração em minutos. */
function paraShifts(
  porDia: Record<string, Array<{ inicio: string; fim: string }>>,
): Array<{ dayOfWeek: string; start: string; duration: number }> {
  const shifts: Array<{ dayOfWeek: string; start: string; duration: number }> = [];
  for (const dia of DIAS) {
    for (const t of porDia[dia.key] ?? []) {
      const [ih, im] = t.inicio.split(':').map(Number);
      const [fh, fm] = t.fim.split(':').map(Number);
      shifts.push({
        dayOfWeek: dia.key,
        start: `${t.inicio}:00`,
        duration: fh * 60 + fm - (ih * 60 + im),
      });
    }
  }
  return shifts;
}
