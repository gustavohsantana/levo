'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Check, Copy, LoaderCircle, Minus, Plus, ShoppingBag } from 'lucide-react';
import {
  consultarPagamentoAction,
  criarPedidoPublicoAction,
  type MenuPublico,
} from '@/presentation/public-menu';
import { Button, Field, Input, Select, Textarea } from '../primitives';
import { currency } from '../format';

type PixPendente = {
  orderId: string;
  trackingUrl: string;
  qrCode: string;
  qrCodeBase64: string | null;
  expiresAt: string;
  amountCents: number;
  contaTeste: boolean;
  ticketUrl: string | null;
};

/**
 * O cardápio que o cliente vê.
 *
 * Existe para tirar o pedido do marketplace: um restaurante que fatura R$ 10 mil
 * no iFood paga mais de mil reais de comissão por mês, e cada pedido que vem por
 * aqui é margem que fica na casa.
 *
 * Quem abre está com fome, no celular, muitas vezes na rua. Por isso a tela é
 * uma coluna só, o carrinho fica fixo no rodapé e não existe cadastro — nome,
 * telefone e endereço no fim, e pronto. Pedir login aqui é perder o pedido.
 */
export function PublicMenu({ menu }: { menu: MenuPublico }) {
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [modoPagamento, setModoPagamento] = useState<
    'entrega' | 'pix_online' | 'cartao_online'
  >('entrega');
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [pix, setPix] = useState<PixPendente | null>(null);
  const [pixStatus, setPixStatus] = useState<
    'PENDING' | 'PAID' | 'EXPIRED' | 'REJECTED' | 'IN_REVIEW' | 'REFUNDED' | 'CHARGED_BACK' | 'CANCELLED'
  >('PENDING');
  const [copiado, setCopiado] = useState(false);
  const [pixAviso, setPixAviso] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();
  const [checando, checar] = useTransition();
  const inicioPix = useRef<number | null>(null);

  const produtos = useMemo(
    () => menu.categorias.flatMap((categoria) => categoria.produtos),
    [menu],
  );

  const itens = Object.entries(quantidades).filter(([, q]) => q > 0);
  const subtotal = itens.reduce((total, [id, quantidade]) => {
    const produto = produtos.find((p) => p.id === id);
    return total + (produto?.priceCents ?? 0) * quantidade;
  }, 0);

  const taxa = Math.round(menu.establishment.deliveryFeeReais * 100);
  const total = subtotal + (subtotal > 0 ? taxa : 0);

  useEffect(() => {
    if (!pix || pixStatus !== 'PENDING') return;

    inicioPix.current ??= Date.now();

    const intervalo = setInterval(async () => {
      const forcar = inicioPix.current !== null && Date.now() - inicioPix.current > 20_000;
      const resultado = await consultarPagamentoAction(
        menu.establishment.slug,
        pix.orderId,
        forcar,
      );

      if (!resultado.ok) return;

      setPixStatus(resultado.status);
      if (resultado.status === 'PAID') {
        setPixAviso(null);
        setFeito(resultado.trackingUrl);
      }
    }, 3000);

    return () => clearInterval(intervalo);
  }, [menu.establishment.slug, pix, pixStatus]);

  function ajustar(id: string, delta: number) {
    setQuantidades((atual) => {
      const proximo = Math.max(0, (atual[id] ?? 0) + delta);
      const novo = { ...atual, [id]: proximo };
      if (proximo === 0) delete novo[id];
      return novo;
    });
  }

  function enviarPedido(formData: FormData) {
    setErro(null);

    formData.set(
      'items',
      JSON.stringify(itens.map(([productId, quantity]) => ({ productId, quantity }))),
    );
    formData.set('modoPagamento', modoPagamento);

    enviar(async () => {
      const resultado = await criarPedidoPublicoAction(menu.establishment.slug, formData);
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }

      if (resultado.modo === 'entrega') {
        setFeito(resultado.trackingUrl);
        return;
      }

      if (resultado.modo === 'cartao') {
        window.location.href = resultado.checkoutUrl;
        return;
      }

      setPix({
        orderId: resultado.orderId,
        trackingUrl: resultado.trackingUrl,
        qrCode: resultado.qrCode,
        qrCodeBase64: resultado.qrCodeBase64,
        expiresAt: resultado.expiresAt,
        amountCents: resultado.amountCents,
        contaTeste: resultado.contaTeste,
        ticketUrl: resultado.ticketUrl,
      });
      setPixStatus('PENDING');
      setPixAviso(null);
      inicioPix.current = Date.now();
    });
  }

  async function copiarCodigo() {
    if (!pix?.qrCode) return;
    await navigator.clipboard.writeText(pix.qrCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function jaPaguei() {
    if (!pix) return;
    setPixAviso(null);

    checar(async () => {
      const resultado = await consultarPagamentoAction(
        menu.establishment.slug,
        pix.orderId,
        true,
      );

      if (!resultado.ok) {
        setPixAviso(resultado.error);
        return;
      }

      setPixStatus(resultado.status);
      if (resultado.status === 'PAID') {
        setFeito(resultado.trackingUrl);
        return;
      }
      if (resultado.status === 'EXPIRED') {
        setPixAviso('O código expirou. Faça um novo pedido para gerar outro Pix.');
        return;
      }
      setPixAviso(
        'Ainda não identificamos o pagamento. Confira no banco e tente de novo em alguns segundos.',
      );
    });
  }

  if (feito) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Check className="size-6" aria-hidden />
        </span>

        <h1 className="text-xl font-semibold text-ink">Pedido enviado!</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {menu.establishment.name} já recebeu. Acompanhe a entrega pelo link abaixo — ele
          mostra o entregador no mapa quando o pedido sair.
        </p>

        <Button asChild variant="primary">
          <a href={feito}>Acompanhar meu pedido</a>
        </Button>
      </main>
    );
  }

  if (pix) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-8">
        <header>
          <h1 className="text-xl font-semibold text-ink">Pague com Pix</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {pixStatus === 'EXPIRED'
              ? 'O código expirou. Faça um novo pedido para gerar outro Pix.'
              : 'Escaneie o QR Code ou copie o código no app do seu banco.'}
          </p>
        </header>

        {pixStatus === 'PENDING' ? (
          <>
            {pix.contaTeste ? (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">
                <p className="font-medium">Conta de teste do Mercado Pago</p>
                <p className="mt-1 leading-relaxed">
                  Este Pix <strong>não funciona</strong> no app do banco (Nubank, Inter…). O código
                  contém <code className="text-xs">TESTUSER</code> — é simulado. Em teste, o pagamento
                  costuma confirmar sozinho em alguns segundos; ou conecte a conta{' '}
                  <strong>de produção</strong> em Integrações para cobrar de verdade.
                </p>
                {pix.ticketUrl ? (
                  <a
                    href={pix.ticketUrl}
                    className="mt-2 inline-block text-sm font-medium underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir página de teste no Mercado Pago
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg bg-raised p-4 text-center">
              <p className="numeric text-lg font-semibold text-ink">{currency(pix.amountCents)}</p>
              {pix.qrCodeBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="mx-auto mt-4 size-56 rounded-md bg-white p-2"
                />
              ) : null}
            </div>

            <Button type="button" variant="outline" onClick={copiarCodigo}>
              {copiado ? <Check /> : <Copy />}
              {copiado ? 'Copiado!' : 'Copiar código Pix'}
            </Button>

            <Button type="button" variant="primary" onClick={jaPaguei} disabled={checando}>
              {checando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              {checando ? 'Conferindo…' : 'Já paguei'}
            </Button>

            {pixAviso ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 hairline">
                {pixAviso}
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Aguardando pagamento…
              </p>
            )}
          </>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-32 pt-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {menu.establishment.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Peça direto com a gente. Entrega com o nosso motoboy.
        </p>
      </header>

      {checkout ? (
        <form action={enviarPedido} className="flex flex-col gap-3.5">
          <button
            type="button"
            onClick={() => setCheckout(false)}
            className="self-start text-sm text-ink-muted hover:underline"
          >
            ← Voltar ao cardápio
          </button>

          <div className="rounded-lg bg-raised p-3">
            {itens.map(([id, quantidade]) => {
              const produto = produtos.find((p) => p.id === id)!;
              return (
                <div key={id} className="flex justify-between py-0.5 text-sm">
                  <span className="min-w-0 truncate text-ink">
                    {quantidade}× {produto.name}
                  </span>
                  <span className="numeric shrink-0 text-ink-muted">
                    {currency(produto.priceCents * quantidade)}
                  </span>
                </div>
              );
            })}

            {taxa > 0 ? (
              <div className="mt-1 flex justify-between border-t pt-1 text-sm">
                <span className="text-ink-muted">Entrega</span>
                <span className="numeric text-ink-muted">{currency(taxa)}</span>
              </div>
            ) : null}

            <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
              <span className="text-ink">Total</span>
              <span className="numeric text-ink">{currency(total)}</span>
            </div>
          </div>

          <Field label="Seu nome">
            <Input name="customerName" required autoFocus />
          </Field>

          <Field label="WhatsApp" hint="para você acompanhar a entrega">
            <Input name="customerPhone" inputMode="tel" placeholder="(35) 99999-9999" required />
          </Field>

          <Field label="Endereço" hint="rua, número, bairro">
            <Input name="address" required />
          </Field>

          <Field label="Complemento" hint="apartamento, portão, referência">
            <Input name="reference" />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">Pagamento</legend>

            {menu.pixOnlineDisponivel ? (
              <>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-checked:border-accent has-checked:bg-accent-soft/30">
                  <input
                    type="radio"
                    name="modoPagamentoUi"
                    className="mt-0.5"
                    checked={modoPagamento === 'pix_online'}
                    onChange={() => setModoPagamento('pix_online')}
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">Pagar agora (Pix)</span>
                    <span className="block text-xs text-ink-muted">
                      QR Code na tela — confirmação automática
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-checked:border-accent has-checked:bg-accent-soft/30">
                  <input
                    type="radio"
                    name="modoPagamentoUi"
                    className="mt-0.5"
                    checked={modoPagamento === 'cartao_online'}
                    onChange={() => setModoPagamento('cartao_online')}
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">Pagar agora (cartão)</span>
                    <span className="block text-xs text-ink-muted">
                      Crédito ou débito no Mercado Pago — o dinheiro cai na conta da loja
                    </span>
                  </span>
                </label>
              </>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-checked:border-accent has-checked:bg-accent-soft/30">
              <input
                type="radio"
                name="modoPagamentoUi"
                className="mt-0.5"
                checked={modoPagamento === 'entrega'}
                onChange={() => setModoPagamento('entrega')}
              />
              <span>
                <span className="block text-sm font-medium text-ink">Pagar na entrega</span>
                <span className="block text-xs text-ink-muted">
                  Dinheiro, cartão ou Pix com o entregador
                </span>
              </span>
            </label>
          </fieldset>

          {modoPagamento === 'entrega' ? (
            <Field label="Como vai pagar na entrega" hint="o entregador leva a maquininha">
              <Select name="paymentMethod" defaultValue="">
                <option value="">Escolha</option>
                <option value="CASH">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CREDIT">Cartão de crédito</option>
                <option value="DEBIT">Cartão de débito</option>
              </Select>
            </Field>
          ) : null}

          <Field label="Observações">
            <Textarea name="notes" rows={2} placeholder="Sem cebola, troco para R$ 100…" />
          </Field>

          {erro ? (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={enviando}>
            {enviando ? <LoaderCircle className="animate-spin" /> : null}
            {modoPagamento === 'pix_online'
              ? 'Gerar Pix e pedir'
              : modoPagamento === 'cartao_online'
                ? 'Pagar com cartão'
                : 'Enviar pedido'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          {menu.categorias.map((categoria) => (
            <section key={categoria.nome}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {categoria.nome}
              </h2>

              <ul className="flex flex-col gap-2">
                {categoria.produtos.map((produto) => {
                  const quantidade = quantidades[produto.id] ?? 0;

                  return (
                    <li
                      key={produto.id}
                      className="flex items-center gap-3 rounded-lg bg-surface p-3 hairline"
                    >
                      {produto.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={produto.imageUrl}
                          alt=""
                          className="size-14 shrink-0 rounded-md object-cover"
                          loading="lazy"
                        />
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{produto.name}</p>
                        {produto.description ? (
                          <p className="line-clamp-2 text-xs text-ink-faint">
                            {produto.description}
                          </p>
                        ) : null}
                        <p className="numeric mt-0.5 text-sm text-ink">
                          {currency(produto.priceCents)}
                        </p>
                      </div>

                      {quantidade === 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => ajustar(produto.id, 1)}
                          aria-label={`Adicionar ${produto.name}`}
                        >
                          <Plus />
                        </Button>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => ajustar(produto.id, -1)}
                            aria-label={`Menos ${produto.name}`}
                          >
                            <Minus />
                          </Button>
                          <span className="numeric w-5 text-center text-sm">{quantidade}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => ajustar(produto.id, 1)}
                            aria-label={`Mais ${produto.name}`}
                          >
                            <Plus />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!checkout && itens.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t bg-surface p-4">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="numeric text-sm font-semibold text-ink">{currency(total)}</p>
              <p className="text-xs text-ink-faint">
                {itens.reduce((n, [, q]) => n + q, 0)} item(ns)
                {taxa > 0 ? ` · entrega ${currency(taxa)}` : ''}
              </p>
            </div>

            <Button variant="primary" onClick={() => setCheckout(true)}>
              <ShoppingBag />
              Fechar pedido
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
