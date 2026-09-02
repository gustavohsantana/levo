import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { NOME_DA_PLATAFORMA, type Plataforma, type Relatorio } from '@/presentation/reports-core';
import { EmptyState } from '../primitives';
import { currency } from '../format';

/**
 * O relatório do dono.
 *
 * Os filtros vivem na URL, não no estado do componente: assim o dono guarda nos
 * favoritos "iFood nos últimos 30 dias", manda o link para o sócio, e o botão
 * de voltar do navegador faz o que ele espera. Também dispensa JavaScript para
 * a tela inteira funcionar.
 */

const STATUS_LEGIVEL: Record<string, string> = {
  NEW: 'Novo',
  IN_ROUTE: 'Em rota',
  DELIVERED: 'Entregue',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

function dataBr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function diaBr(dia: string): string {
  const [, mes, d] = dia.split('-');
  return `${d}/${mes}`;
}

export function Reports({ dados, atalhos }: { dados: Relatorio; atalhos: Atalho[] }) {
  const { resumo, filtro } = dados;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Relatórios</h1>
        <p className="mt-1 text-sm text-ink-muted">
          O que saiu, por onde e com quem. Faturamento conta só pedido entregue.
        </p>
      </div>

      <Filtros dados={dados} atalhos={atalhos} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Entregues" valor={String(resumo.entregues)} nota={`${resumo.pedidos} pedidos no período`} />
        <Cartao titulo="Faturamento" valor={currency(resumo.faturamentoCents)} nota={`taxas: ${currency(resumo.taxasCents)}`} />
        <Cartao titulo="Ticket médio" valor={currency(resumo.ticketMedioCents)} nota="por pedido entregue" />
        <Cartao
          titulo="Tempo médio"
          valor={resumo.tempoMedioMinutos !== null ? `${resumo.tempoMedioMinutos} min` : '—'}
          nota="do pedido à entrega"
        />
      </div>

      {resumo.cancelados > 0 || resumo.emAberto > 0 ? (
        <p className="text-sm text-ink-muted">
          {resumo.cancelados > 0 ? `${resumo.cancelados} cancelado(s)` : null}
          {resumo.cancelados > 0 && resumo.emAberto > 0 ? ' · ' : null}
          {resumo.emAberto > 0 ? `${resumo.emAberto} ainda em aberto` : null}
          {' — fora do faturamento.'}
        </p>
      ) : null}

      {dados.linhas.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhum pedido no período"
          description="Ajuste as datas ou os filtros acima."
        />
      ) : (
        <>
          <PorDia dados={dados} />

          <div className="grid gap-4 lg:grid-cols-2">
            <PorPlataforma dados={dados} />
            <PorEntregador dados={dados} />
          </div>

          <Detalhe dados={dados} />
        </>
      )}
    </div>
  );
}

function Cartao({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-lg bg-surface p-4 hairline">
      <p className="text-xs uppercase tracking-wide text-ink-faint">{titulo}</p>
      <p className="numeric mt-1 text-xl font-semibold text-ink">{valor}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{nota}</p>
    </div>
  );
}

export interface Atalho {
  rotulo: string;
  href: string;
  ativo: boolean;
}

function Filtros({ dados, atalhos }: { dados: Relatorio; atalhos: Atalho[] }) {
  const { filtro, entregadores } = dados;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 hairline">
      <div className="flex flex-wrap gap-1.5">
        {atalhos.map((a) => (
          <Link
            key={a.rotulo}
            href={a.href}
            className={`rounded-full px-3 py-1 text-sm transition ${
              a.ativo
                ? 'bg-accent text-accent-contrast'
                : 'bg-raised text-ink-muted hover:text-ink'
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {/* GET puro: cada busca vira uma URL, e o back do navegador desfaz. */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <Campo rotulo="De">
          <input type="date" name="de" defaultValue={filtro.de} className={ENTRADA} />
        </Campo>
        <Campo rotulo="Até">
          <input type="date" name="ate" defaultValue={filtro.ate} className={ENTRADA} />
        </Campo>

        <Campo rotulo="Plataforma">
          <select name="plataforma" defaultValue={filtro.plataforma ?? ''} className={ENTRADA}>
            <option value="">Todas</option>
            {(Object.keys(NOME_DA_PLATAFORMA) as Plataforma[]).map((p) => (
              <option key={p} value={p}>
                {NOME_DA_PLATAFORMA[p]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Entregador">
          <select name="entregador" defaultValue={filtro.entregadorId ?? ''} className={ENTRADA}>
            <option value="">Todos</option>
            {entregadores.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Situação">
          <select name="status" defaultValue={filtro.status ?? ''} className={ENTRADA}>
            <option value="">Todas</option>
            <option value="DELIVERED">Entregues</option>
            <option value="EM_ABERTO">Em aberto</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="FAILED">Falharam</option>
          </select>
        </Campo>

        <button
          type="submit"
          className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-contrast transition hover:opacity-90"
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}

const ENTRADA =
  'h-10 rounded-lg bg-raised px-3 text-sm text-ink hairline outline-none focus:ring-2 focus:ring-accent/40';

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-faint">{rotulo}</span>
      {children}
    </label>
  );
}

function PorDia({ dados }: { dados: Relatorio }) {
  const maior = Math.max(...dados.porDia.map((d) => d.pedidos), 1);

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <h2 className="text-sm font-medium text-ink">Pedidos por dia</h2>

      {/* Barras em CSS: um gráfico de verdade aqui seria uma biblioteca inteira
          para desenhar trinta retângulos. */}
      <div className="mt-3 flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: 96 }}>
        {dados.porDia.map((d) => (
          <div key={d.dia} className="flex w-9 shrink-0 flex-col items-center gap-1">
            <span className="numeric text-[11px] text-ink-faint">{d.pedidos}</span>
            <div
              className="w-full rounded-t bg-accent/70"
              style={{ height: Math.max(4, (d.pedidos / maior) * 64) }}
              title={`${d.pedidos} pedidos · ${currency(d.valorCents)}`}
            />
            <span className="text-[10px] text-ink-faint">{diaBr(d.dia)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PorPlataforma({ dados }: { dados: Relatorio }) {
  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <h2 className="text-sm font-medium text-ink">Por plataforma</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {dados.porPlataforma.map((p) => (
          <li key={p.plataforma}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">{NOME_DA_PLATAFORMA[p.plataforma] ?? p.plataforma}</span>
              <span className="numeric text-ink-muted">
                {p.pedidos} · {currency(p.valorCents)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-accent" style={{ width: `${p.fatia * 100}%` }} />
            </div>
          </li>
        ))}
        {dados.porPlataforma.length === 0 ? (
          <li className="text-sm text-ink-faint">Nenhuma entrega concluída no período.</li>
        ) : null}
      </ul>
    </section>
  );
}

function PorEntregador({ dados }: { dados: Relatorio }) {
  const totalAPagar = dados.porEntregador.reduce((t, e) => t + e.aPagarCents, 0);

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">Por entregador</h2>
        {totalAPagar > 0 ? (
          <span className="numeric text-sm text-ink-muted">
            a pagar: <strong className="text-ink">{currency(totalAPagar)}</strong>
          </span>
        ) : null}
      </div>

      <ul className="mt-3 flex flex-col gap-2.5 text-sm">
        {dados.porEntregador.map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-ink">
              {e.nome}
              <span className="ml-2 text-xs text-ink-faint">
                {e.entregas} entregas
                {e.tempoMedioMinutos !== null ? ` · ${e.tempoMedioMinutos} min` : ''}
              </span>
            </span>

            {/*
              Acordo em branco mostra o aviso, não R$ 0,00: zero pareceria uma
              conta fechada, e o dono só descobriria o buraco no dia do acerto.
            */}
            {e.semAcordo ? (
              <Link
                href={`/dashboard/entregadores/${e.id}`}
                className="shrink-0 text-xs text-ink-muted underline underline-offset-2"
              >
                definir acordo
              </Link>
            ) : (
              <span className="numeric shrink-0 text-ink">{currency(e.aPagarCents)}</span>
            )}
          </li>
        ))}
        {dados.porEntregador.length === 0 ? (
          <li className="text-ink-faint">Nenhuma entrega atribuída no período.</li>
        ) : null}
      </ul>
    </section>
  );
}

function Detalhe({ dados }: { dados: Relatorio }) {
  return (
    <section className="rounded-lg bg-surface hairline">
      <h2 className="border-b px-4 py-3 text-sm font-medium text-ink">Pedidos</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-2 font-medium">Quando</th>
              <th className="px-4 py-2 font-medium">Plataforma</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Endereço</th>
              <th className="px-4 py-2 font-medium">Entregador</th>
              <th className="px-4 py-2 font-medium">Situação</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {dados.linhas.map((l) => (
              <tr key={l.id} className="border-b last:border-b-0">
                <td className="numeric whitespace-nowrap px-4 py-2 text-ink-muted">
                  {dataBr(l.quando)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-ink-muted">
                  {NOME_DA_PLATAFORMA[l.plataforma] ?? l.plataforma}
                  {l.displayId ? <span className="ml-1 text-ink-faint">#{l.displayId}</span> : null}
                </td>
                <td className="max-w-40 truncate px-4 py-2 text-ink">{l.cliente}</td>
                <td className="max-w-64 truncate px-4 py-2 text-ink-faint">{l.endereco}</td>
                <td className="whitespace-nowrap px-4 py-2 text-ink-muted">{l.entregador ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-2 text-ink-muted">
                  {STATUS_LEGIVEL[l.status] ?? l.status}
                </td>
                <td className="numeric whitespace-nowrap px-4 py-2 text-right text-ink">
                  {currency(l.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*
        A navegação repete os filtros na URL.

        Sem isso, mudar de página perderia o período e a plataforma que o dono
        escolheu — e ele voltaria para a primeira tela sem entender por quê.
      */}
      {dados.paginas > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <span className="text-ink-faint">
            <span className="numeric">{dados.totalDeLinhas}</span> pedidos · página{' '}
            <span className="numeric">{dados.pagina}</span> de{' '}
            <span className="numeric">{dados.paginas}</span>
          </span>

          <div className="flex gap-2">
            {dados.pagina > 1 ? (
              <Link href={paginaUrl(dados, dados.pagina - 1)} className={BOTAO_PAGINA}>
                Anterior
              </Link>
            ) : null}
            {dados.pagina < dados.paginas ? (
              <Link href={paginaUrl(dados, dados.pagina + 1)} className={BOTAO_PAGINA}>
                Próxima
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const BOTAO_PAGINA =
  'rounded-md bg-raised px-3 py-1.5 text-sm text-ink transition hover:opacity-80';

/** O endereço da página pedida, carregando os filtros atuais. */
function paginaUrl(dados: Relatorio, pagina: number): string {
  const p = new URLSearchParams();
  p.set('de', dados.filtro.de);
  p.set('ate', dados.filtro.ate);
  if (dados.filtro.plataforma) p.set('plataforma', dados.filtro.plataforma);
  if (dados.filtro.entregadorId) p.set('entregador', dados.filtro.entregadorId);
  if (dados.filtro.status) p.set('status', dados.filtro.status);
  if (pagina > 1) p.set('pagina', String(pagina));
  return `/dashboard/relatorios?${p.toString()}`;
}
