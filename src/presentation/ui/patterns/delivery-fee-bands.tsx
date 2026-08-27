'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Plus, Route as RouteIcon, Trash2 } from 'lucide-react';
import { salvarFaixasAction } from '@/presentation/actions';
import { Button, Input } from '../primitives';

/**
 * Taxa de entrega por distância.
 *
 * "Até 3 km, R$ 5. Até 6 km, R$ 8." É como o setor precifica frete, e sem isso
 * o valor vive na cabeça de quem atende — que erra no sábado cheio, sempre para
 * menos.
 *
 * A distância é em linha reta a partir do estabelecimento, não pela rua. É o
 * que os aplicativos usam para faixa de frete, e medir pela rua custaria uma
 * chamada de roteirização por pedido para mudar quase nada no valor.
 */
export interface Faixa {
  km: number;
  reais: number;
}

export function DeliveryFeeBands({ inicial }: { inicial: Faixa[] }) {
  const [faixas, setFaixas] = useState<Faixa[]>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, submit] = useTransition();

  function mudar(indice: number, campo: keyof Faixa, valor: string) {
    setFaixas((atual) =>
      atual.map((faixa, i) =>
        i === indice ? { ...faixa, [campo]: Number(valor.replace(',', '.')) || 0 } : faixa,
      ),
    );
    setSalvo(false);
  }

  function salvar() {
    setErro(null);
    setSalvo(false);

    submit(async () => {
      // Ordenadas na hora de salvar: o dono digita fora de ordem, e a regra
      // depende da sequência para escolher a faixa certa.
      const ordenadas = [...faixas].sort((a, b) => a.km - b.km);
      const resultado = await salvarFaixasAction(JSON.stringify(ordenadas));

      if (resultado.ok) {
        setFaixas(ordenadas);
        setSalvo(true);
      } else {
        setErro(resultado.error);
      }
    });
  }

  return (
    <section className="rounded-lg bg-surface p-5 hairline">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
          <RouteIcon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Taxa por distância</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Cada faixa cobre até a distância indicada. Quem estiver além da última paga o
            valor dela. Sem faixa nenhuma, vale a taxa fixa acima.
          </p>
        </div>
      </div>

      {faixas.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {faixas.map((faixa, indice) => (
            <li key={indice} className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-ink-muted">até</span>

              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={faixa.km || ''}
                onChange={(evento) => mudar(indice, 'km', evento.target.value)}
                className="w-20"
                aria-label={`Distância da faixa ${indice + 1}`}
              />
              <span className="shrink-0 text-sm text-ink-muted">km</span>

              <span className="shrink-0 text-sm text-ink-muted">·</span>

              <span className="shrink-0 text-sm text-ink-muted">R$</span>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={faixa.reais || ''}
                onChange={(evento) => mudar(indice, 'reais', evento.target.value)}
                className="w-24"
                aria-label={`Valor da faixa ${indice + 1}`}
              />

              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                aria-label="Remover faixa"
                onClick={() => {
                  setFaixas((atual) => atual.filter((_, i) => i !== indice));
                  setSalvo(false);
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">Nenhuma faixa. A taxa fixa vale para todos.</p>
      )}

      {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
      {salvo ? <p className="mt-3 text-sm text-accent-ink">Faixas salvas.</p> : null}

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const ultima = faixas[faixas.length - 1];
            setFaixas([...faixas, { km: (ultima?.km ?? 0) + 3, reais: (ultima?.reais ?? 5) + 3 }]);
            setSalvo(false);
          }}
        >
          <Plus />
          Nova faixa
        </Button>

        <Button variant="primary" onClick={salvar} disabled={pendente}>
          {pendente ? <LoaderCircle className="animate-spin" /> : null}
          Salvar faixas
        </Button>
      </div>
    </section>
  );
}
