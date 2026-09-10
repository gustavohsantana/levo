'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import {
  buscarCepAction,
  criarPedidoPublicoAction,
  sugerirCidadeAction,
  type MenuPublico,
} from '@/presentation/public-menu';
import {
  gravarPagamentoPendente,
  gravarRascunho,
  lerCarrinho,
  lerPagamentoPendente,
  lerRascunho,
  type LinhaCarrinho,
  type RascunhoPedido,
} from '@/presentation/menu-session';
import { Button, Field, Input, Select, Textarea } from '../primitives';
import { currency } from '../format';
import { ConfirmarNoMapa } from './confirmar-no-mapa';
import { mesmaRua } from '@/core/services/endereco';
import { montarEndereco } from '@/presentation/address-parts';

/**
 * Segunda etapa: dados, endereço e forma de pagamento.
 *
 * O carrinho veio do cardápio via sessionStorage — esta URL é um link de
 * verdade, então o voltar do celular devolve o cliente ao cardápio sem perder
 * os itens.
 */
export function PublicCheckout({ menu }: { menu: MenuPublico }) {
  const router = useRouter();
  const slug = menu.establishment.slug;
  const [pronto, setPronto] = useState(false);
  const [linhas, setLinhas] = useState<LinhaCarrinho[]>([]);
  const [rascunho, setRascunho] = useState<RascunhoPedido | null>(null);
  const [pagamentoAberto, setPagamentoAberto] = useState<string | null>(null);
  const [modoPagamento, setModoPagamento] = useState<
    'entrega' | 'pix_online' | 'cartao_online'
  >('entrega');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, enviar] = useTransition();
  const [cidade, setCidade] = useState(menu.establishment.city);
  const cidadeEditada = useRef(false);
  /*
   * Bairro e rua passam a ser controlados porque o CEP os preenche. Cidade já
   * era, por causa do GPS.
   */
  const [bairro, setBairro] = useState('');
  const [rua, setRua] = useState('');
  /*
   * O número também é controlado — não pelo CEP, mas pela conferência no mapa:
   * ela precisa do número para mostrar o pino na porta certa, o mesmo que o
   * pedido vai geocodificar. Sem estado, a prévia ficaria sempre sem número.
   */
  const [numero, setNumero] = useState('');
  /*
   * Entrega ou retirada.
   *
   * A escolha vem antes do endereço de propósito: quem vai buscar não deveria
   * digitar rua nenhuma, e descobrir isso depois de preencher tudo é o tipo de
   * formulário que faz desistir.
   */
  const [retirada, setRetirada] = useState(false);
  /** A rua que o CEP aponta, quando difere da que a pessoa escreveu. */
  const [sugestaoRua, setSugestaoRua] = useState<string | null>(null);
  /**
   * O ponto que o cliente marcou, quando o endereço não foi encontrado.
   *
   * O valor é usado, não só o setter: sem ele, o pino ficava preso no estado e
   * nunca chegava ao servidor — o pedido caía sem localização mesmo com o
   * cliente tendo marcado no mapa. Vai para o formulário como `pinLat`/`pinLng`,
   * que é o que a action lê.
   */
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [cep, setCep] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<string | null>(null);
  const gpsPedido = useRef(false);

  /*
   * O efeito é o lugar certo aqui, apesar da regra: o rascunho vive no
   * armazenamento do navegador, que não existe no servidor, e este estado é
   * editado pelo cliente depois de semeado — então `useSyncExternalStore`, que
   * serve para espelhar uma fonte externa, não se aplica. O render a mais no
   * montar é o preço de casar a hidratação, e é pago uma vez só.
   */
  useEffect(() => {
    const rascunhoSalvo = lerRascunho(slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- semeadura a partir do armazenamento do navegador
    setLinhas(lerCarrinho(slug));
    setRascunho(rascunhoSalvo);
    setPagamentoAberto(lerPagamentoPendente(slug)?.orderId ?? null);
    if (rascunhoSalvo?.modoPagamento) setModoPagamento(rascunhoSalvo.modoPagamento);
    if (rascunhoSalvo?.city) {
      cidadeEditada.current = true;
      setCidade(rascunhoSalvo.city);
    }
    if (rascunhoSalvo?.neighborhood) setBairro(rascunhoSalvo.neighborhood);
    if (rascunhoSalvo?.street) setRua(rascunhoSalvo.street);
    if (rascunhoSalvo?.number) setNumero(rascunhoSalvo.number);
    setPronto(true);
  }, [slug]);

  const produtos = useMemo(
    () => menu.categorias.flatMap((categoria) => categoria.produtos),
    [menu],
  );

  const itens = linhas.filter((linha) => linha.quantity > 0);
  /* O preço da linha, que já inclui as opções escolhidas. */
  const subtotal = itens.reduce(
    (total, linha) => total + linha.unitPriceCents * linha.quantity,
    0,
  );

  const taxa = retirada ? 0 : Math.round(menu.establishment.deliveryFeeReais * 100);
  const total = subtotal + (subtotal > 0 ? taxa : 0);

  useEffect(() => {
    if (gpsPedido.current) return;
    if (!navigator.geolocation) return;
    gpsPedido.current = true;

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        void sugerirCidadeAction(posicao.coords.latitude, posicao.coords.longitude).then(
          (resultado) => {
            if (!resultado.ok || cidadeEditada.current) return;
            setCidade(resultado.cidade);
          },
        );
      },
      () => {
        /* Recusou ou o GPS falhou: fica a cidade da loja. */
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    );
  }, []);

  /**
   * Busca o endereço quando os oito dígitos estão completos.
   *
   * Não sobrescreve o que o cliente já digitou: CEP de cidade pequena cobre o
   * município inteiro e volta sem rua, e apagar o que ele escreveu seria
   * castigá-lo por tentar ajudar.
   */
  async function completarPeloCep(valor: string) {
    const digitos = valor.replace(/\D/g, '');
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    setAvisoCep(null);
    try {
      const r = await buscarCepAction(digitos);
      if (!r.ok) {
        setAvisoCep('CEP não encontrado. Preencha o endereço abaixo.');
        return;
      }
      cidadeEditada.current = true;
      setCidade(r.endereco.cidade);

      /*
       * Preenche o que está vazio; NUNCA troca o que a pessoa escreveu.
       *
       * Custou um pedido: o cliente digitou a rua certa, depois preencheu o CEP
       * com um dígito errado, e nós substituímos calado. Em loteamento novo os
       * CEPs consecutivos são ruas paralelas — 37558-721 e 37558-722 são a rua
       * de trás e a da frente —, então o erro produz um endereço plausível, que
       * ninguém confere, e o motoboy descobre no portão.
       *
       * Divergência vira pergunta, não substituição. Quem digitou está na
       * própria casa; o CEP é palpite de um dígito.
       */
      if (r.endereco.bairro && !bairro.trim()) setBairro(r.endereco.bairro);

      const ruaAtual = rua.trim();
      if (r.endereco.rua && !ruaAtual) {
        setRua(r.endereco.rua);
        setAvisoCep(null);
      } else if (r.endereco.rua && !mesmaRua(ruaAtual, r.endereco.rua)) {
        setSugestaoRua(r.endereco.rua);
      } else if (!r.endereco.rua) {
        setAvisoCep('Este CEP cobre a cidade toda — informe a rua.');
      }
    } finally {
      setBuscandoCep(false);
    }
  }

  function enviarPedido(formData: FormData) {
    setErro(null);

    const rascunhoAtual: RascunhoPedido = {
      customerName: String(formData.get('customerName') ?? ''),
      customerPhone: String(formData.get('customerPhone') ?? ''),
      city: String(formData.get('city') ?? ''),
      neighborhood: String(formData.get('neighborhood') ?? ''),
      street: String(formData.get('street') ?? ''),
      number: String(formData.get('number') ?? ''),
      reference: String(formData.get('reference') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      modoPagamento,
      paymentMethod: String(formData.get('paymentMethod') ?? ''),
    };
    gravarRascunho(slug, rascunhoAtual);

    /*
     * Vão os ids das opções, nunca o preço: o servidor lê o valor do banco e
     * recalcula. O que a tela mostrou é conferência para o cliente, não fonte
     * de verdade sobre dinheiro.
     */
    formData.set(
      'items',
      JSON.stringify(
        itens.map((linha) => ({
          productId: linha.productId,
          quantity: linha.quantity,
          options: linha.options,
        })),
      ),
    );
    formData.set('modoPagamento', modoPagamento);

    enviar(async () => {
      const resultado = await criarPedidoPublicoAction(slug, formData);
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }

      if (resultado.modo === 'entrega') {
        gravarPagamentoPendente(slug, { trackingToken: resultado.trackingToken });
        router.push(`/t/${resultado.trackingToken}`);
        return;
      }

      gravarPagamentoPendente(slug, {
        orderId: resultado.orderId,
        trackingToken: resultado.trackingToken,
      });

      if (resultado.modo === 'cartao') {
        if (resultado.checkoutUrl) {
          window.location.href = resultado.checkoutUrl;
          return;
        }
        router.push(`/cardapio/${slug}/pagamento?pedido=${resultado.orderId}`);
        return;
      }

      router.push(`/cardapio/${slug}/pagamento?pedido=${resultado.orderId}`);
    });
  }

  if (!pronto) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-sm text-ink-muted">Carregando pedido…</main>
    );
  }

  if (itens.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="text-xl font-semibold text-ink">Sacola vazia</h1>
        <p className="text-sm text-ink-muted">Volte ao cardápio e escolha os itens.</p>
        <Link href={`/cardapio/${slug}`} className="text-sm font-medium text-accent-ink underline">
          Abrir cardápio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-6">
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          enviarPedido(new FormData(evento.currentTarget));
        }}
        className="flex flex-col gap-3.5"
      >
        <Link
          href={`/cardapio/${slug}`}
          className="self-start text-sm text-ink-muted hover:underline"
        >
          ← Voltar ao cardápio
        </Link>

        <h1 className="text-xl font-semibold tracking-tight text-ink">{menu.establishment.name}</h1>

        {menu.establishment.preparo ? (
          <p className="text-sm text-ink-faint">
            A cozinha está saindo em{' '}
            <span className="font-medium text-ink-muted">{menu.establishment.preparo}</span>
            {retirada ? ' — depois é só buscar.' : ', mais o tempo de entrega.'}
          </p>
        ) : null}

        {pagamentoAberto ? (
          <p className="rounded-md bg-accent-soft/50 px-3 py-2 text-sm text-accent-ink hairline">
            Tem um Pix ou cartão esperando.{' '}
            <Link href={`/cardapio/${slug}/pagamento?pedido=${pagamentoAberto}`} className="font-medium underline">
              Voltar a pagar
            </Link>
            {' · '}pode mandar outro pedido se mudou alguma coisa.
          </p>
        ) : null}
        <div className="rounded-lg bg-raised p-3">
          {itens.map((linha) => {
            const produto = produtos.find((p) => p.id === linha.productId)!;
            return (
              <div key={linha.id} className="flex justify-between gap-2 py-1 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ink">
                    {linha.quantity}× {produto.name}
                  </span>
                  {/*
                    O que ele montou, para conferir antes de pagar. Sem isto o
                    cliente vê "1× Pizza Grande R$ 107,40" sem saber de onde
                    saiu o valor — e desiste no lugar de perguntar.
                  */}
                  {linha.nomes.length > 0 ? (
                    <span className="block text-xs leading-snug text-ink-faint">
                      {linha.nomes.join(' · ')}
                    </span>
                  ) : null}
                </span>
                <span className="numeric shrink-0 text-ink-muted">
                  {currency(linha.unitPriceCents * linha.quantity)}
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

        {/*
          A escolha vem antes de tudo.

          Quem vai buscar não deveria digitar rua nenhuma, e descobrir isso
          depois de preencher o endereço inteiro é o formulário que faz
          desistir.
        */}
        {menu.establishment.pickupEnabled ? (
          <div className="flex gap-2">
            {(
              [
                [false, '🛵 Entrega'],
                [true, '🏪 Retirar no balcão'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={rotulo}
                type="button"
                onClick={() => setRetirada(valor)}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  retirada === valor
                    ? 'bg-accent text-accent-contrast'
                    : 'bg-surface text-ink-muted hairline hover:text-ink'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        ) : null}

        {retirada ? (
          <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm">
            <p className="font-medium text-accent-ink">Retirada no balcão</p>
            <p className="mt-1 leading-relaxed text-accent-ink/80">
              {menu.establishment.address ?? 'Retire na loja'}
            </p>
            <p className="mt-1.5 text-xs text-accent-ink/80">
              Sem taxa de entrega. Avisamos aqui quando estiver pronto.
            </p>
          </div>
        ) : null}

        <input type="hidden" name="fulfillment" value={retirada ? 'PICKUP' : 'DELIVERY'} />

        <Field label="Seu nome">
          <Input name="customerName" required autoFocus defaultValue={rascunho?.customerName} />
        </Field>

        <Field label="WhatsApp" hint="para você acompanhar a entrega">
          <Input
            name="customerPhone"
            inputMode="tel"
            placeholder="(35) 99999-9999"
            required
            defaultValue={rascunho?.customerPhone}
          />
        </Field>

        {/*
          Todo o endereço some na retirada.

          Escondido, e não desabilitado: campo cinza ainda ocupa a tela e faz
          quem vai buscar se perguntar se precisa preencher. O `required` dos
          campos sai junto — senão o navegador bloqueia o envio reclamando de
          um campo que ninguém vê.
        */}
        {retirada ? null : (
          <>
        {/*
          O CEP vem primeiro porque é o atalho: oito dígitos preenchem cidade,
          bairro e rua. Quem não sabe o CEP pula e digita — por isso não é
          obrigatório.
        */}
        <Field label="CEP">
          <Input
            name="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={cep}
            onChange={(evento) => {
              setCep(evento.target.value);
              void completarPeloCep(evento.target.value);
            }}
          />
          <p className="mt-1 text-xs text-ink-faint">
            {buscandoCep
              ? 'Buscando endereço…'
              : (avisoCep ?? 'Preenche cidade, bairro e rua. Opcional.')}
          </p>
        </Field>

        <Field label="Cidade">
          <Input
            name="city"
            required
            autoComplete="address-level2"
            value={cidade}
            onChange={(evento) => {
              cidadeEditada.current = true;
              setCidade(evento.target.value);
            }}
          />
        </Field>

        <Field label="Bairro">
          <Input
            name="neighborhood"
            required
            autoComplete="address-level3"
            value={bairro}
            onChange={(evento) => setBairro(evento.target.value)}
          />
        </Field>

        <div className="grid grid-cols-[1fr_5.75rem] gap-2">
          <Field label="Rua">
            <Input
              name="street"
              required
              autoComplete="address-line1"
              value={rua}
              onChange={(evento) => {
                setRua(evento.target.value);
                // Ele mesmo está corrigindo: a sugestão perdeu o sentido.
                setSugestaoRua(null);
              }}
            />

            {/*
              O CEP discorda do que a pessoa escreveu.

              Quem digitou está na própria casa; o CEP é palpite de um dígito.
              Então a divergência vira pergunta, e a escolha é dela.
            */}
            {sugestaoRua ? (
              <div className="mt-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <p className="leading-relaxed">
                  Este CEP aponta para <strong>{sugestaoRua}</strong>. Confira se você digitou
                  o CEP certo — ruas vizinhas costumam ter CEPs quase iguais.
                </p>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRua(sugestaoRua);
                      setSugestaoRua(null);
                    }}
                    className="font-medium underline underline-offset-2"
                  >
                    Usar a do CEP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSugestaoRua(null)}
                    className="text-amber-900/70 underline underline-offset-2"
                  >
                    Manter a minha
                  </button>
                </div>
              </div>
            ) : null}
          </Field>
          <Field label="Número">
            <Input
              name="number"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="s/n"
              value={numero}
              onChange={(evento) => setNumero(evento.target.value)}
            />
          </Field>
        </div>

        {/*
          A conferência fica DEPOIS do endereço e ANTES do pagamento.

          É o último momento em que o cliente ainda está pensando em onde mora.
          Passado dali ele está pensando em dinheiro, e qualquer coisa sobre
          endereço vira obstáculo entre ele e o pedido.
        */}
        {menu.establishment.lat != null && menu.establishment.lng != null ? (
          <ConfirmarNoMapa
            slug={slug}
            /*
             * O MESMO endereço que o pedido vai geocodificar, montado do mesmo
             * jeito que o servidor monta no envio. Antes a prévia juntava
             * "rua, bairro, cidade" por vírgula e sem número — mas a base do
             * IBGE lê "rua, número - bairro", então a prévia dizia "não achamos"
             * um endereço que o pedido, logo depois, achava. Agora as duas
             * concordam, e o número entra: é ele que leva o pino à porta, não ao
             * meio da rua. Se faltar (o cliente ainda não digitou), a busca cai
             * no centro da via — o número não trava rua que existe, porque o
             * geocodificador tenta também sem ele.
             */
            endereco={montarEndereco({ rua, numero, bairro, cidade })}
            origem={{ lat: menu.establishment.lat, lng: menu.establishment.lng }}
            onPin={setPin}
          />
        ) : null}

        {/*
          O pino marcado no mapa vai junto no envio.
          A action prefere este ponto à geocodificação do texto — é o cliente
          dizendo onde mora, que é mais confiável que qualquer geocodificador.
        */}
        {pin ? (
          <>
            <input type="hidden" name="pinLat" value={pin.lat} />
            <input type="hidden" name="pinLng" value={pin.lng} />
          </>
        ) : null}

        <Field label="Complemento" hint="apartamento, portão, referência">
          <Input name="reference" autoComplete="address-line2" defaultValue={rascunho?.reference} />
        </Field>
          </>
        )}

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
                    QR Code na próxima tela — confirmação automática
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
                    Crédito ou débito na próxima tela — o dinheiro cai na conta da loja
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
            <Select name="paymentMethod" defaultValue={rascunho?.paymentMethod ?? ''}>
              <option value="">Escolha</option>
              <option value="CASH">Dinheiro</option>
              <option value="PIX">Pix</option>
              <option value="CREDIT">Cartão de crédito</option>
              <option value="DEBIT">Cartão de débito</option>
            </Select>
          </Field>
        ) : null}

        <Field label="Observações">
          <Textarea
            name="notes"
            rows={2}
            placeholder="Sem cebola, troco para R$ 100…"
            defaultValue={rascunho?.notes}
          />
        </Field>

        {erro ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {erro}
          </p>
        ) : null}

        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando ? <LoaderCircle className="animate-spin" /> : null}
          {modoPagamento === 'pix_online'
            ? 'Ir para o Pix'
            : modoPagamento === 'cartao_online'
              ? 'Pagar com cartão'
              : 'Enviar pedido'}
        </Button>
      </form>
    </main>
  );
}
