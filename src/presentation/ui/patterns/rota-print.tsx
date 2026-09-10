'use client';

import { useEffect } from 'react';
import type { RotaImpressao } from '@/presentation/queries';

/**
 * A rota no papel, para a mão do motoboy.
 *
 * As paradas em ordem, com endereço, telefone, itens e quanto receber. Papel é
 * o plano B do rastreio — bateria, sinal e tela apagada não derrubam uma folha.
 * Abre já no diálogo de impressão; o botão fica de reserva.
 */
export function RotaPrint({ rota }: { rota: RotaImpressao }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="print-actions">
        <button type="button" onClick={() => window.print()} className="print-btn">
          Imprimir
        </button>
        <span>Não abriu sozinho? Toque em Imprimir. Sai a 72&nbsp;mm.</span>
      </div>

      <div className="print-wrap">
        <div className="receipt">
          <div className="r-center">
            <div className="r-brand">ROTA · {rota.courier.toUpperCase()}</div>
            <div className="r-tag">
              {dataHora(rota.criadoEm)} · {rota.paradas.length}{' '}
              {rota.paradas.length === 1 ? 'parada' : 'paradas'}
            </div>
          </div>

          {rota.paradas.map((p, i) => (
            <div key={i}>
              <hr className="r-double" />
              <div className="r-row">
                <span className="r-strong">PARADA {p.posicao}</span>
                {p.displayId ? <span className="g">#{p.displayId}</span> : null}
              </div>
              <div className="r-strong">{p.cliente}</div>
              {p.pickup ? (
                <div className="r-tag">Retirada no balcão</div>
              ) : (
                <>
                  <div>{p.endereco}</div>
                  {p.referencia ? <div className="r-tag">Ref: {p.referencia}</div> : null}
                </>
              )}
              {p.telefone ? <div className="r-tag">{p.telefone}</div> : null}
              {p.itensResumo ? <div className="r-foot">{p.itensResumo}</div> : null}
              <div className="r-pay">
                {p.pago
                  ? '✓ PAGO'
                  : `▸ RECEBER R$ ${reais(p.totalCents)} (${PAGAMENTO[p.pagamento ?? 'null']})`}
              </div>
            </div>
          ))}

          {rota.paradas.length === 0 ? (
            <>
              <hr className="r-double" />
              <div className="r-center r-tag">Rota sem paradas.</div>
            </>
          ) : null}

          <hr className="r-double" />
          <div className="r-sp" />
        </div>
      </div>
    </>
  );
}

const PAGAMENTO: Record<string, string> = {
  CASH: 'dinheiro',
  CREDIT: 'crédito',
  DEBIT: 'débito',
  PIX: 'Pix',
  ONLINE: 'online',
  null: 'a combinar',
};

function reais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataHora(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 180 * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const CSS = `
  .print-actions {
    position: sticky; top: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
    padding: 14px 20px; background: #16130f; color: #d8dccf; font: 14px/1.4 system-ui, sans-serif;
  }
  .print-btn {
    appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600;
    background: #6f9e1f; color: #fff; padding: 8px 18px; border-radius: 8px;
  }
  .print-wrap {
    display: flex; justify-content: center; padding: 28px 16px; background: #e9ece4;
    min-height: 100vh; align-items: flex-start;
  }
  .receipt {
    width: 302px; max-width: 100%; background: #fff; color: #16130f;
    font-family: "IBM Plex Mono", ui-monospace, "Courier New", monospace;
    font-size: 12.5px; line-height: 1.5; letter-spacing: -.01em;
    padding: 18px 18px 6px; box-shadow: 0 14px 28px -16px rgba(0,0,0,.45), 0 2px 6px -3px rgba(0,0,0,.2);
  }
  .receipt .g { color: #4a463f; }
  .r-center { text-align: center; }
  .r-brand { font-weight: 700; font-size: 15px; letter-spacing: .02em; }
  .r-tag { color: #4a463f; font-size: 11.5px; }
  .r-double { border: 0; border-top: 3px double #8f8a7e; margin: 8px 0; }
  .r-row { display: flex; justify-content: space-between; gap: 10px; }
  .r-strong { font-weight: 700; }
  .r-foot { color: #4a463f; font-size: 11px; }
  .r-pay { background: #efeee9; padding: 4px 7px; margin: 6px -7px; font-weight: 600; }
  .r-sp { height: 10px; }

  @media print {
    @page { margin: 4mm; }
    html, body { background: #fff !important; }
    .print-actions { display: none !important; }
    .print-wrap { display: block; padding: 0; background: #fff; min-height: 0; }
    .receipt { width: 72mm; max-width: none; box-shadow: none; padding: 0; font-size: 11pt; }
  }
`;
