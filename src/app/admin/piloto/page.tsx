import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/presentation/http/session';
import { getPilotMetrics } from '@/presentation/pilot-metrics';
import { Button } from '@/presentation/ui/primitives';

export const metadata: Metadata = { title: 'Piloto · Girô', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PilotPage() {
  if (!(await getSession())) redirect('/login');
  const metrics = await getPilotMetrics();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-5">
        <Link href="/dashboard">
          <ArrowLeft />
          Voltar ao painel
        </Link>
      </Button>

      <h1 className="text-xl font-semibold tracking-tight text-ink">Evidência do piloto</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Últimos <span className="numeric">{metrics.windowDays}</span> dias. Tudo aqui sai do log de
        eventos do domínio — nenhuma contagem paralela que possa divergir do que de fato aconteceu.
      </p>

      <section className="mt-7">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          A pergunta principal
        </h2>
        <div className="mt-2 rounded-lg bg-accent-soft px-5 py-4">
          <p className="numeric text-3xl font-semibold text-accent-ink">
            {metrics.savedMinutesTotal} min
          </p>
          <p className="mt-1 text-sm text-accent-ink/80">
            economizados no total, média de{' '}
            <span className="numeric font-medium">{metrics.savedMinutesPerRoute} min</span> por rota,
            em <span className="numeric font-medium">{metrics.routes}</span>{' '}
            {metrics.routes === 1 ? 'rota' : 'rotas'}.
          </p>
          <p className="mt-2 text-xs text-accent-ink/70">
            Comparado com a ordem em que os pedidos chegaram, usando a mesma matriz de tempo — mesmo
            motor, mesmo trânsito, mesmo momento.
          </p>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          O produto funciona na rua?
        </h2>
        <dl className="mt-2 grid gap-px overflow-hidden rounded-lg bg-line sm:grid-cols-2">
          <Metric
            label="Entregas no prazo previsto"
            value={metrics.onTimeRate === null ? null : `${metrics.onTimeRate}%`}
            note="Tolerância de 10 min. Diz se a promessa feita ao cliente final se sustenta."
          />
          <Metric
            label="Desvio típico do ETA"
            value={
              metrics.medianEtaDeviationMinutes === null
                ? null
                : `${metrics.medianEtaDeviationMinutes > 0 ? '+' : ''}${metrics.medianEtaDeviationMinutes} min`
            }
            note="Mediana. Positivo é atraso; negativo é chegar antes."
          />
          <Metric
            label="Paradas marcadas pelo motoboy"
            value={String(metrics.stopsMarkedByCourier)}
            note="Adoção real. Se ele não marca, o produto não entrou no fluxo dele — e isso é problema de interface, não do motoboy."
          />
          <Metric
            label="Endereços localizados"
            value={metrics.geocodeSuccessRate === null ? null : `${metrics.geocodeSuccessRate}%`}
            note="Endereço brasileiro é bagunçado; esta é a métrica que mais dói quando cai."
          />
          <Metric
            label="Aberturas do rastreio por pedido"
            value={metrics.trackingOpensPerOrder === null ? null : String(metrics.trackingOpensPerOrder)}
            note="Prova se o cliente final liga para isso. Decide se vira destaque ou some."
          />
          <Metric
            label="Do pedido até a rota sair"
            value={
              metrics.medianMinutesToDispatch === null
                ? null
                : `${metrics.medianMinutesToDispatch} min`
            }
            note="Mediana. É o gargalo operacional que o produto ataca."
          />
        </dl>
      </section>

      <section className="mt-7">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">Volume</h2>
        <dl className="mt-2 grid gap-px overflow-hidden rounded-lg bg-line sm:grid-cols-3">
          <Metric label="Pedidos" value={String(metrics.ordersCreated)} />
          <Metric label="Entregues" value={String(metrics.delivered)} />
          <Metric label="Não entregues" value={String(metrics.failed)} />
        </dl>
      </section>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string | null; note?: string }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      {/*
        Sem dado é "sem dado", nunca zero. Um zero inventado num painel de
        piloto leva a conclusão errada sobre o produto.
      */}
      <dd className="numeric mt-0.5 text-lg font-medium text-ink">
        {value ?? <span className="text-base font-normal text-ink-faint">ainda sem dados</span>}
      </dd>
      {note ? <p className="mt-1 text-xs leading-relaxed text-ink-faint">{note}</p> : null}
    </div>
  );
}
