'use client';

import { useState, useTransition } from 'react';
import { Check, FlaskConical, Link2, LoaderCircle, TriangleAlert, Unlink } from 'lucide-react';
import {
  conectarMercadoPagoDoEnv,
  desconectarMercadoPago,
} from '@/presentation/integration-actions';
import { Button } from '../primitives';

/**
 * Conectar o Mercado Pago para receber pelo cardápio.
 *
 * O card tem quatro estados, e três deles existem por causa de coisas que
 * acontecem *depois* de conectar. Um botão que só sabe dizer "conectar" é fácil
 * de escrever e ruim de operar: o lojista pode revogar o acesso dentro da conta
 * dele a qualquer momento, sem avisar ninguém, e a partir daí o cardápio para de
 * oferecer Pix em silêncio. O dono não descobre — ele acha que o movimento caiu.
 *
 * Por isso "precisa reconectar" é vermelho e explica o que aconteceu, em vez de
 * simplesmente voltar ao estado de quem nunca conectou.
 */
export type EstadoMercadoPago = 'desconectado' | 'conectado' | 'teste' | 'reconectar';

interface Props {
  estado: EstadoMercadoPago;
  conta: { nome: string | null; email: string | null } | null;
  /** Falso quando faltam as credenciais da aplicação no ambiente. */
  disponivel: boolean;
  /** Client ID + Secret — OAuth de lojista, se o painel mostrar esse par. */
  oauthDisponivel: boolean;
  /** Public Key + Access Token da aba de produção. */
  prodDisponivel: boolean;
  /** Public Key + Access Token da aba de teste — só no `next dev`. */
  testeDisponivel: boolean;
  /** Resultado do último consentimento, vindo do `?mercadopago=` do callback. */
  aviso?: string | null;
}

export function MercadoPagoConnect({
  estado,
  conta,
  disponivel,
  oauthDisponivel,
  prodDisponivel,
  testeDisponivel,
  aviso,
}: Props) {
  const [pendente, startTransition] = useTransition();
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const mensagem = aviso ? MENSAGENS[aviso] : null;

  if (estado === 'desconectado' || estado === 'reconectar') {
    const precisaReconectar = estado === 'reconectar';

    return (
      <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
        <h3 className="font-semibold text-ink">
          {precisaReconectar ? 'Mercado Pago desconectado' : 'Receber pagamento pelo cardápio'}
        </h3>

        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          {!disponivel ? (
            <>
              Ainda não configurado neste ambiente. As credenciais do Mercado Pago precisam estar
              no servidor antes de oferecer Pix e cartão. Enquanto isso, o cardápio cobra na
              entrega.
            </>
          ) : precisaReconectar ? (
            <>
              A autorização não vale mais — ela pode ter sido revogada na sua conta do Mercado
              Pago. <strong className="text-ink">Pix e cartão saíram do seu cardápio</strong> até
              você conectar de novo.
            </>
          ) : (
            <>
              O cliente paga por Pix ou cartão na hora do pedido e o dinheiro cai na sua conta do
              Mercado Pago, com a sua taxa. O Levô não fica com nada da venda.
            </>
          )}
        </p>

        {mensagem ? <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso> : null}
        {erroAcao ? <Aviso tom="erro">{erroAcao}</Aviso> : null}

        {disponivel ? (
          <div className="mt-4 flex flex-col gap-3">
            {prodDisponivel ? (
              <>
                <Button
                  variant="primary"
                  disabled={pendente}
                  onClick={() =>
                    startTransition(async () => {
                      setErroAcao(null);
                      const resultado = await conectarMercadoPagoDoEnv('producao');
                      if (!resultado.ok) {
                        setErroAcao(resultado.error ?? 'Não foi possível conectar.');
                      }
                    })
                  }
                >
                  {pendente ? <LoaderCircle className="animate-spin" /> : <Link2 />}
                  {precisaReconectar ? 'Conectar de novo' : 'Conectar Mercado Pago'}
                </Button>

                <p className="text-xs leading-relaxed text-ink-faint">
                  Public Key e Access Token de produção. O Pix cai nesta conta, com a taxa dela. O
                  Levô não fica com nada da venda.
                </p>
              </>
            ) : null}

            {oauthDisponivel && !prodDisponivel ? (
              <>
                {/*
                 * `<a>` de verdade, e não botão com ação: o cookie de `state` que
                 * protege contra CSRF só viaja numa navegação de topo.
                 */}
                <Button asChild variant="primary">
                  <a href="/api/integrations/mercadopago/connect">
                    <Link2 />
                    {precisaReconectar ? 'Conectar de novo' : 'Conectar Mercado Pago'}
                  </a>
                </Button>

                <p className="text-xs leading-relaxed text-ink-faint">
                  Use a mesma conta da sua maquininha. Conectar não muda nada nela — só permite que o
                  cardápio gere a cobrança. Você precisa ter uma chave Pix cadastrada no Mercado Pago.
                </p>
              </>
            ) : null}

            {testeDisponivel ? (
              <>
                <Button
                  variant={oauthDisponivel || prodDisponivel ? 'ghost' : 'primary'}
                  disabled={pendente}
                  onClick={() =>
                    startTransition(async () => {
                      setErroAcao(null);
                      const resultado = await conectarMercadoPagoDoEnv('teste');
                      if (!resultado.ok) {
                        setErroAcao(resultado.error ?? 'Não foi possível conectar a conta de teste.');
                      }
                    })
                  }
                >
                  {pendente ? <LoaderCircle className="animate-spin" /> : <FlaskConical />}
                  Conectar conta de teste
                </Button>

                <p className="text-xs leading-relaxed text-ink-faint">
                  Esta é a conta de teste da aplicação. Nenhum pagamento vira dinheiro de verdade.
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const emTeste = estado === 'teste';

  return (
    <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
      <div className="flex items-start gap-3">
        <span
          className={
            emTeste
              ? 'mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700'
              : 'mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink'
          }
        >
          {emTeste ? (
            <TriangleAlert className="size-4" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
        </span>

        <div className="min-w-0">
          <h3 className="font-semibold text-ink">
            {emTeste ? 'Mercado Pago conectado em teste' : 'Mercado Pago conectado'}
          </h3>

          <p className="mt-1 text-sm text-ink-muted">
            {emTeste ? (
              <>
                Esta é uma conta de teste: nenhuma cobrança vira dinheiro de verdade. Conecte com a
                conta de produção antes de abrir para os clientes.
              </>
            ) : (
              <>
                O Pix e o cartão do cardápio caem em{' '}
                <strong className="text-ink">{conta?.nome ?? conta?.email ?? 'sua conta'}</strong>.
              </>
            )}
          </p>

          {/*
           * O e-mail aparece junto porque é o que distingue a conta pessoal da
           * conta da empresa. Quem conectou a errada só percebe vendo isto.
           */}
          {conta?.email && conta.nome ? (
            <p className="mt-0.5 text-xs text-ink-faint">{conta.email}</p>
          ) : null}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-auto self-start pt-4"
        disabled={pendente}
        onClick={() => startTransition(async () => void (await desconectarMercadoPago()))}
      >
        {pendente ? <LoaderCircle className="animate-spin" /> : <Unlink />}
        Desconectar
      </Button>

      {mensagem ? <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso> : null}
      {erroAcao ? <Aviso tom="erro">{erroAcao}</Aviso> : null}

      {emTeste && prodDisponivel ? (
        <Button
          variant="primary"
          className="mt-4"
          disabled={pendente}
          onClick={() =>
            startTransition(async () => {
              setErroAcao(null);
              const resultado = await conectarMercadoPagoDoEnv('producao');
              if (!resultado.ok) {
                setErroAcao(resultado.error ?? 'Não foi possível conectar.');
              }
            })
          }
        >
          {pendente ? <LoaderCircle className="animate-spin" /> : <Link2 />}
          Trocar para produção
        </Button>
      ) : null}
    </div>
  );
}

function Aviso({ tom, children }: { tom: 'erro' | 'info'; children: React.ReactNode }) {
  return (
    <p
      className={
        tom === 'erro'
          ? 'mt-4 rounded-md bg-red-50 p-3 text-sm leading-relaxed text-red-800'
          : 'mt-4 rounded-md bg-amber-50 p-3 text-sm leading-relaxed text-amber-900'
      }
    >
      {children}
    </p>
  );
}

/**
 * O que o callback tem a dizer.
 *
 * Antes disto o resultado do consentimento ia para a URL e morria lá — a tela
 * ignorava o parâmetro, e quem tentava conectar e falhava via a mesma página de
 * sempre, sem nenhuma pista do que deu errado.
 */
const MENSAGENS: Record<string, { tom: 'erro' | 'info'; texto: string }> = {
  recusado: {
    tom: 'info',
    texto: 'A autorização foi cancelada. Nada mudou na sua conta.',
  },
  'sem-codigo': {
    tom: 'erro',
    texto: 'O Mercado Pago não devolveu a autorização. Tente conectar de novo.',
  },
  'sem-chave-pix': {
    tom: 'erro',
    texto:
      'Esta conta do Mercado Pago não tem chave Pix cadastrada, e sem ela a cobrança falha na ' +
      'hora do pedido. Cadastre uma chave no aplicativo do Mercado Pago — pode ser aleatória — e ' +
      'conecte de novo.',
  },
  'conectado-em-teste': {
    tom: 'info',
    texto: 'Conectado com uma conta de teste. Nenhuma cobrança vira dinheiro de verdade.',
  },
};
