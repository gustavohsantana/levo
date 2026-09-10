'use client';

import { useEffect } from 'react';
import type { OrderView } from '@/presentation/queries';

/**
 * Um pedido no papel: comanda para a cozinha e cupom para o saco.
 *
 * Página própria, fora do painel, sem barra lateral — só os recibos e um CSS de
 * 80mm. Abre já no diálogo de impressão; se o navegador barrar o automático,
 * o botão fica ali. A cozinha lê a comanda (sem preço, com as opções em
 * destaque), o cliente recebe o cupom (com preço, total e pagamento).
 */
export function ComandaCupomPrint({ loja, pedido }: { loja: string; pedido: OrderView }) {
  useEffect(() => {
    // Um tique para o layout assentar antes de o diálogo abrir.
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  const linhas = pedido.items.map((i) => ({
    ...i,
    lineCents: i.unitPriceCents * i.quantity - i.discountCents,
  }));
  const subtotal = linhas.reduce((t, l) => t + l.lineCents, 0);
  const taxa = pedido.pickup ? 0 : pedido.deliveryFeeCents;
  const total = subtotal + taxa;

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
        {/* ---- COMANDA (cozinha, sem preço) ---- */}
        <div className="receipt">
          <div className="r-center">
            <div className="r-brand">{loja.toUpperCase()}</div>
            <div className="r-title">* COMANDA *</div>
          </div>
          <hr className="r-dash" />
          <div className="r-row">
            <span className="r-strong">{pedido.displayId ? `#${pedido.displayId}` : 'Pedido'}</span>
            <span className="g">{dataHora(pedido.createdAt)}</span>
          </div>
          <div className="r-row">
            <span>{pedido.customerName}</span>
            <span className="g">{FONTE[pedido.source]}</span>
          </div>
          <hr className="r-double" />
          {linhas.map((l, i) => (
            <div key={i} className="item">
              <div className="r-line">
                <span className="r-qty">{l.quantity}x</span>
                <span>{l.name.toUpperCase()}</span>
              </div>
              {l.options.length > 0 ? <div className="r-opt">{l.options.join(', ')}</div> : null}
            </div>
          ))}
          {pedido.notes ? (
            <>
              <hr className="r-double" />
              <div>
                <span className="r-strong">OBS:</span> {pedido.notes}
              </div>
            </>
          ) : null}
          <hr className="r-dash" />
          <div className="r-center r-big">{pedido.pickup ? 'RETIRADA' : 'ENTREGA'}</div>
          <div className="r-sp" />
        </div>

        {/* ---- CUPOM (saco, com preço) ---- */}
        <div className="receipt">
          <div className="r-center">
            <div className="r-brand">{loja.toUpperCase()}</div>
            <div className="r-tag">{FONTE[pedido.source]}</div>
          </div>
          <hr className="r-dash" />
          <div className="r-row">
            <span className="r-strong">{pedido.displayId ? `PEDIDO #${pedido.displayId}` : 'PEDIDO'}</span>
            <span className="g">{dataHora(pedido.createdAt)}</span>
          </div>
          <hr className="r-double" />
          {pedido.pickup ? (
            <>
              <div className="r-tag">RETIRADA NO BALCÃO</div>
              <div className="r-strong">{pedido.customerName}</div>
              {pedido.customerPhone ? <div>{pedido.customerPhone}</div> : null}
            </>
          ) : (
            <>
              <div className="r-tag">ENTREGAR PARA</div>
              <div className="r-strong">{pedido.customerName}</div>
              {pedido.customerPhone ? <div>{pedido.customerPhone}</div> : null}
              <div>{pedido.address}</div>
              {pedido.reference ? <div className="r-tag">Ref: {pedido.reference}</div> : null}
            </>
          )}
          <hr className="r-double" />
          {linhas.map((l, i) => (
            <div key={i} className="item">
              <div className="r-row">
                <span className="r-line">
                  <span className="r-qty">{l.quantity}x</span>
                  {l.name}
                </span>
                <span className="r-money">{reais(l.lineCents)}</span>
              </div>
              {l.options.length > 0 ? <div className="r-opt">{l.options.join(', ')}</div> : null}
            </div>
          ))}
          <hr className="r-dash" />
          <div className="r-row">
            <span className="g">Subtotal</span>
            <span className="r-money">{reais(subtotal)}</span>
          </div>
          {pedido.pickup ? null : (
            <div className="r-row">
              <span className="g">Taxa de entrega</span>
              <span className="r-money">{reais(taxa)}</span>
            </div>
          )}
          <hr className="r-dash" />
          <div className="r-row r-total">
            <span>TOTAL</span>
            <span className="r-money">R$ {reais(total)}</span>
          </div>
          <hr className="r-double" />
          <div className="r-pay">Pagamento: {PAGAMENTO[pedido.paymentMethod ?? 'null']}</div>
          <hr className="r-dash" />
          <div className="r-center r-foot">Obrigado pela preferência!</div>
          <div className="r-sp" />
        </div>
      </div>
    </>
  );
}

const FONTE: Record<OrderView['source'], string> = {
  MANUAL: 'Telefone / balcão',
  SITE: 'Cardápio próprio',
  WEBHOOK: 'Integração',
  IFOOD: 'iFood',
  AIQFOME: 'aiqfome',
};

const PAGAMENTO: Record<string, string> = {
  CASH: 'DINHEIRO',
  CREDIT: 'Cartão de crédito',
  DEBIT: 'Cartão de débito',
  PIX: 'Pix',
  ONLINE: 'PAGO (online)',
  null: 'Não informado',
};

/** Centavos → "1.234,56". */
function reais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** ISO → "20/09 20:15" no fuso de Brasília. */
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
    display: flex; flex-wrap: wrap; gap: 24px; justify-content: center;
    padding: 28px 16px; background: #e9ece4; min-height: 100vh; align-items: flex-start;
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
  .r-title { font-weight: 700; letter-spacing: .16em; }
  .r-big { font-weight: 700; font-size: 14px; }
  .r-dash { border: 0; border-top: 1px dashed #b9b4a9; margin: 7px 0; }
  .r-double { border: 0; border-top: 3px double #8f8a7e; margin: 8px 0; }
  .r-row { display: flex; justify-content: space-between; gap: 10px; }
  .r-line { display: flex; gap: 8px; }
  .r-qty { font-weight: 700; white-space: nowrap; }
  .r-opt { color: #4a463f; padding-left: 26px; font-size: 11.5px; }
  .r-money { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .r-total { font-weight: 700; font-size: 14px; }
  .r-strong { font-weight: 700; }
  .item + .item { margin-top: 2px; }
  .r-pay { background: #efeee9; padding: 4px 7px; margin: 6px -7px; font-weight: 600; }
  .r-foot { color: #4a463f; font-size: 11px; }
  .r-sp { height: 10px; }

  @media print {
    @page { margin: 4mm; }
    html, body { background: #fff !important; }
    .print-actions { display: none !important; }
    .print-wrap { display: block; padding: 0; background: #fff; min-height: 0; }
    .receipt {
      width: 72mm; max-width: none; box-shadow: none; padding: 0;
      font-size: 11pt; page-break-after: always;
    }
    .receipt:last-child { page-break-after: auto; }
  }
`;
