'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { pagarCartaoAction, type DadosCartaoBrick, type StatusPagamentoOnline } from '@/presentation/public-menu';
import { Button, Field, Input, Select } from '../primitives';

type DadosDoFormulario = {
  token?: string;
  paymentMethodId?: string;
  issuerId?: string;
  installments?: string | number;
  cardholderEmail?: string;
  identificationType?: string;
  identificationNumber?: string;
};

type CardFormInstancia = {
  getCardFormData: () => DadosDoFormulario;
  unmount?: () => void;
};

type MercadoPagoSdk = {
  cardForm: (settings: Record<string, unknown>) => CardFormInstancia;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale: string }) => MercadoPagoSdk;
  }
}

const CAMPO_SEGURO =
  'block h-9 overflow-hidden rounded-md bg-surface px-3 hairline [&>iframe]:h-full [&>iframe]:w-full';

const ESTILO_IFRAME = {
  fontSize: '14px',
  height: '20px',
  color: '#2c2a26',
  placeholderColor: '#9a948c',
};

/**
 * Formulário de cartão na nossa página — o mesmo papel do QR no Pix.
 *
 * Número, validade e CVV ficam em iframe do Mercado Pago (PCI deles). Nome,
 * CPF e o botão Pagar são componentes nossos, no mesmo visual do restante
 * do cardápio.
 */
export function CartaoNaTela({
  slug,
  orderId,
  publicKey,
  amountCents,
  contaTeste,
  onPago,
  onRecusado,
}: {
  slug: string;
  orderId: string;
  publicKey: string;
  amountCents: number;
  contaTeste: boolean;
  onPago: (status: StatusPagamentoOnline, trackingToken: string) => void;
  onRecusado: (mensagem: string) => void;
}) {
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const formulario = useRef<CardFormInstancia | null>(null);
  const onPagoRef = useRef(onPago);
  const onRecusadoRef = useRef(onRecusado);
  /*
   * As callbacks vão para refs num efeito, não durante o render: escrever em
   * ref enquanto renderiza quebra sob render concorrente, em que o React pode
   * descartar e refazer o trabalho. Sem lista de dependências de propósito —
   * a intenção é justamente guardar sempre a última versão recebida.
   */
  useEffect(() => {
    onPagoRef.current = onPago;
    onRecusadoRef.current = onRecusado;
  });

  useEffect(() => {
    let cancelado = false;

    async function montar() {
      try {
        await carregarSdk();
        if (cancelado || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const instancia = mp.cardForm({
          amount: (Math.round(amountCents) / 100).toFixed(2),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: {
              id: 'form-checkout__cardNumber',
              placeholder: 'Número do cartão',
              style: ESTILO_IFRAME,
            },
            expirationDate: {
              id: 'form-checkout__expirationDate',
              placeholder: 'MM/AA',
              style: ESTILO_IFRAME,
            },
            securityCode: {
              id: 'form-checkout__securityCode',
              placeholder: 'CVV',
              style: ESTILO_IFRAME,
            },
            cardholderName: {
              id: 'form-checkout__cardholderName',
              placeholder: 'Nome impresso no cartão',
            },
            issuer: {
              id: 'form-checkout__issuer',
              placeholder: 'Banco',
            },
            installments: {
              id: 'form-checkout__installments',
              placeholder: 'Parcelas',
            },
            identificationType: {
              id: 'form-checkout__identificationType',
              placeholder: 'Documento',
            },
            identificationNumber: {
              id: 'form-checkout__identificationNumber',
              placeholder: 'CPF',
            },
            cardholderEmail: {
              id: 'form-checkout__cardholderEmail',
              placeholder: 'E-mail',
            },
          },
          callbacks: {
            onFormMounted: (falha?: unknown) => {
              if (cancelado) return;
              if (falha) {
                setErro('Não foi possível abrir o formulário do cartão. Recarregue a página.');
                return;
              }
              setPronto(true);
            },
            onSubmit: (evento: Event) => {
              evento.preventDefault();
              const dados = instancia.getCardFormData();
              return enviarToken(dados, slug, orderId, onPagoRef, onRecusadoRef, setEnviando);
            },
          },
        });

        formulario.current = instancia;
      } catch {
        if (!cancelado) setErro('Não foi possível carregar o pagamento no cartão.');
      }
    }

    void montar();

    return () => {
      cancelado = true;
      formulario.current?.unmount?.();
      formulario.current = null;
    };
  }, [publicKey, amountCents, slug, orderId]);

  return (
    <form id="form-checkout" noValidate className="flex flex-col gap-3.5">
      {!pronto && !erro ? (
        <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Carregando formulário do cartão…
        </p>
      ) : null}

      {erro ? (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>
      ) : null}

      <CamposDoCartao contaTeste={contaTeste} />

      <Button
        type="submit"
        id="form-checkout__submit"
        variant="primary"
        disabled={enviando || !pronto}
        className="w-full"
      >
        {enviando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
        {enviando ? 'Pagando…' : 'Pagar'}
      </Button>
    </form>
  );
}

/**
 * O SDK preenche <select> e iframes no DOM. Se o React renderizar de novo
 * esses nós, apaga as opções de banco/parcela. Por isso este bloco é memo
 * e não recebe estado que muda a cada tecla.
 */
const CamposDoCartao = memo(function CamposDoCartao({ contaTeste }: { contaTeste: boolean }) {
  return (
    <>
      <Field label="Número do cartão">
        <div id="form-checkout__cardNumber" className={CAMPO_SEGURO} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Validade">
          <div id="form-checkout__expirationDate" className={CAMPO_SEGURO} />
        </Field>
        <Field label="CVV">
          <div id="form-checkout__securityCode" className={CAMPO_SEGURO} />
        </Field>
      </div>

      <Field label="Nome no cartão">
        <Input
          id="form-checkout__cardholderName"
          autoComplete="cc-name"
          placeholder="Como está impresso"
        />
      </Field>

      <div className="grid grid-cols-[5.5rem_1fr] gap-2">
        <Field label="Documento">
          <Select id="form-checkout__identificationType" />
        </Field>
        <Field label="CPF ou CNPJ">
          <Input id="form-checkout__identificationNumber" inputMode="numeric" placeholder="000.000.000-00" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Banco">
          <Select id="form-checkout__issuer" />
        </Field>
        <Field label="Parcelas">
          <Select id="form-checkout__installments" />
        </Field>
      </div>

      <input
        id="form-checkout__cardholderEmail"
        type="email"
        readOnly
        tabIndex={-1}
        aria-hidden
        defaultValue={contaTeste ? 'test_user_card@testuser.com' : 'cliente@levoentregas.app'}
        className="sr-only"
      />
    </>
  );
});

function enviarToken(
  dados: DadosDoFormulario,
  slug: string,
  orderId: string,
  onPagoRef: { current: (status: StatusPagamentoOnline, trackingToken: string) => void },
  onRecusadoRef: { current: (mensagem: string) => void },
  setEnviando: (valor: boolean) => void,
): Promise<void> {
  const payload: DadosCartaoBrick = {
    token: dados.token ?? '',
    payment_method_id: dados.paymentMethodId ?? '',
    issuer_id: dados.issuerId,
    installments: Number(dados.installments),
    payer: {
      email: dados.cardholderEmail,
      identification:
        dados.identificationType && dados.identificationNumber
          ? { type: dados.identificationType, number: dados.identificationNumber }
          : undefined,
    },
  };

  setEnviando(true);
  return pagarCartaoAction(slug, orderId, payload)
    .then((resultado) => {
      if (!resultado.ok) {
        onRecusadoRef.current(resultado.error);
        throw new Error(resultado.error);
      }
      if (resultado.status === 'PAID' || resultado.status === 'IN_REVIEW' || resultado.status === 'PENDING') {
        onPagoRef.current(resultado.status, resultado.trackingToken);
        return;
      }
      onRecusadoRef.current(mensagemDoStatus(resultado.status));
      throw new Error(resultado.status);
    })
    .finally(() => setEnviando(false));
}

function mensagemDoStatus(status: StatusPagamentoOnline): string {
  if (status === 'REJECTED') return 'O banco não autorizou. Confira o cartão ou tente outro.';
  if (status === 'EXPIRED') return 'O tempo para pagar acabou. Volte e faça o pedido de novo.';
  return 'Não foi possível confirmar o cartão. Tente de novo.';
}

function carregarSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();

  const ja = document.querySelector<HTMLScriptElement>('script[data-mp-sdk]');
  if (ja) {
    return new Promise((resolve, reject) => {
      ja.addEventListener('load', () => resolve(), { once: true });
      ja.addEventListener('error', () => reject(new Error('sdk')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.dataset.mpSdk = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(script);
  });
}
