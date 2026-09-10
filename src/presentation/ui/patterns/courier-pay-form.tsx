'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { salvarAcordoAction } from '@/presentation/courier-actions';
import { Button } from '../primitives';

/**
 * O acordo de pagamento do motoboy.
 *
 * Três modelos porque são os três que o mercado usa de verdade. Percentual do
 * pedido ficou de fora: é praxe de marketplace, e num delivery próprio faz o
 * motoboy torcer pelo pedido caro em vez do trajeto curto.
 */
export interface AcordoView {
  model: 'POR_ENTREGA' | 'POR_FAIXA' | 'DIARIA_E_ENTREGA' | 'DIARIA_E_FAIXA';
  perDeliveryCents: number;
  dailyCents: number;
  bands: Array<{ uptoMeters: number; amountCents: number }>;
}

const reais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const paraCents = (texto: string) => Math.round(Number(texto.replace(',', '.')) * 100) || 0;

export function CourierPayForm({
  courierId,
  inicial,
}: {
  courierId: string;
  inicial: AcordoView;
}) {
  const [model, setModel] = useState(inicial.model);
  const [porEntrega, setPorEntrega] = useState(reais(inicial.perDeliveryCents));
  const [diaria, setDiaria] = useState(reais(inicial.dailyCents));
  const [faixas, setFaixas] = useState(
    inicial.bands.length > 0
      ? inicial.bands.map((b) => ({ km: String(b.uptoMeters / 1000), valor: reais(b.amountCents) }))
      : [{ km: '3', valor: '7,00' }],
  );
  const [pendente, salvar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  /*
   * A diária é ortogonal ao valor da corrida: `DIARIA_E_FAIXA` mostra a diária
   * E as faixas ao mesmo tempo. Por isso a visibilidade não é "um campo por
   * modelo", e sim três perguntas independentes.
   */
  const usaFixo = model === 'POR_ENTREGA' || model === 'DIARIA_E_ENTREGA';
  const usaDiaria = model === 'DIARIA_E_ENTREGA' || model === 'DIARIA_E_FAIXA';
  const usaFaixa = model === 'POR_FAIXA' || model === 'DIARIA_E_FAIXA';

  function submeter() {
    setAviso(null);
    salvar(async () => {
      const r = await salvarAcordoAction(courierId, {
        model,
        perDeliveryCents: paraCents(porEntrega),
        dailyCents: paraCents(diaria),
        bands: usaFaixa
          ? faixas
              .filter((f) => Number(f.km) > 0)
              .map((f) => ({
                uptoMeters: Math.round(Number(f.km.replace(',', '.')) * 1000),
                amountCents: paraCents(f.valor),
              }))
          : [],
      });
      setAviso(r.ok ? 'Acordo salvo.' : r.error);
    });
  }

  return (
    <section className="rounded-lg bg-surface p-4 hairline">
      <h2 className="text-sm font-medium text-ink">Quanto ele recebe</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        O fechamento do período aparece em Relatórios, somado a partir das entregas.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(
          [
            ['POR_ENTREGA', 'Fixo por entrega'],
            ['POR_FAIXA', 'Por distância'],
            ['DIARIA_E_ENTREGA', 'Diária + entrega'],
            ['DIARIA_E_FAIXA', 'Diária + distância'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setModel(valor)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              model === valor
                ? 'bg-accent text-accent-contrast'
                : 'bg-raised text-ink-muted hover:text-ink'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {usaFixo ? (
          <Campo rotulo="Por entrega (R$)">
            <input
              value={porEntrega}
              onChange={(e) => setPorEntrega(e.target.value)}
              inputMode="decimal"
              className={ENTRADA}
            />
          </Campo>
        ) : null}

        {usaDiaria ? (
          <Campo rotulo="Diária (R$)">
            <input
              value={diaria}
              onChange={(e) => setDiaria(e.target.value)}
              inputMode="decimal"
              className={ENTRADA}
            />
            {/* A diária conta por dia rodado, não por dia do calendário. */}
            <span className="text-xs text-ink-faint">
              Contada uma vez por dia em que ele rodou.
            </span>
          </Campo>
        ) : null}

        {usaFaixa ? (
          <div className="flex flex-col gap-2">
            {faixas.map((f, i) => (
              <div key={i} className="flex items-end gap-2">
                <Campo rotulo="Até (km)">
                  <input
                    value={f.km}
                    onChange={(e) =>
                      setFaixas((a) => a.map((x, j) => (j === i ? { ...x, km: e.target.value } : x)))
                    }
                    inputMode="decimal"
                    className={`${ENTRADA} w-24`}
                  />
                </Campo>
                <Campo rotulo="Paga (R$)">
                  <input
                    value={f.valor}
                    onChange={(e) =>
                      setFaixas((a) =>
                        a.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)),
                      )
                    }
                    inputMode="decimal"
                    className={`${ENTRADA} w-28`}
                  />
                </Campo>
                <button
                  type="button"
                  onClick={() => setFaixas((a) => a.filter((_, j) => j !== i))}
                  aria-label="Remover faixa"
                  className="mb-1 rounded p-2 text-ink-faint hover:bg-raised hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setFaixas((a) => [...a, { km: '', valor: '' }])}
              className="flex items-center gap-1 self-start text-sm text-ink-muted hover:text-ink"
            >
              <Plus className="size-4" aria-hidden />
              Nova faixa
            </button>

            <p className="text-xs leading-relaxed text-ink-faint">
              Entrega mais longe que a última faixa paga o valor dela — o contrário seria
              pagar zero por uma corrida que aconteceu.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={submeter} disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          Salvar acordo
        </Button>
        {aviso ? <span className="text-sm text-ink-muted">{aviso}</span> : null}
      </div>
    </section>
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
