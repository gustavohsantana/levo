import type { Metadata } from 'next';
import { env } from '@/env';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { requireSession } from '@/presentation/http/session';
import { IfoodConnect } from '@/presentation/ui/patterns/ifood-connect';
import { AiqfomeConnect } from '@/presentation/ui/patterns/aiqfome-connect';
import {
  MercadoPagoConnect,
  type EstadoMercadoPago,
} from '@/presentation/ui/patterns/mercadopago-connect';
import { listarLojasAiqfome } from '@/infrastructure/integrations/aiqfome/stores';
import { lerContaMercadoPago } from '@/infrastructure/payments/mercadopago/account';
import { mercadoPagoAccessTokenFor } from '@/infrastructure/payments/mercadopago/factory';

export const metadata: Metadata = { title: 'Integrações · Levô' };
export const dynamic = 'force-dynamic';

/**
 * Onde o dono conecta as plataformas de pedido.
 *
 * Antes disso, vincular uma loja exigia rodar um script pelo terminal — o que
 * na prática significava que só quem escreveu o sistema conseguia colocar um
 * cliente para funcionar.
 */
export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mercadopago?: string }>;
}) {
  const session = await requireSession();
  const { mercadopago: resultadoMp } = await searchParams;
  const prisma = getPrismaClient(env().DATABASE_URL);
  const store = new CredentialStore(prisma, env().AUTH_SECRET);

  /*
   * Credencial ilegível não pode derrubar a tela.
   *
   * Os tokens são cifrados com o AUTH_SECRET, e se ele mudar entre ambientes —
   * ou for rotacionado — o decifrar falha. Isso é recuperável: basta reconectar.
   * Estourar aqui deixaria o dono com uma página quebrada e nenhuma pista do
   * que fazer, quando a saída é um clique.
   */
  const ilegivel = (provider: string) => (cause: unknown) => {
    // Engolir em silêncio esconde a causa justamente quando ela importa: sem
    // isto, uma credencial ilegível é indistinguível de nunca ter conectado.
    console.error('[integracoes] credencial ilegível', {
      establishmentId: session.establishmentId,
      provider,
      cause: String(cause),
    });
    return null;
  };

  const [ifood, aiqfome, mercadoPago] = await Promise.all([
    store.read(session.establishmentId, 'IFOOD').catch(ilegivel('IFOOD')),
    store.read(session.establishmentId, 'AIQFOME').catch(ilegivel('AIQFOME')),
    store.read(session.establishmentId, 'MERCADO_PAGO').catch(ilegivel('MERCADO_PAGO')),
  ]);

  /*
   * A conexão do Mercado Pago é conferida contra a API, não deduzida da
   * existência da linha no banco.
   *
   * Credencial guardada só prova que um dia alguém autorizou. O lojista pode ter
   * revogado o acesso na conta dele ontem, e a diferença entre os dois casos é
   * dinheiro: com a autorização morta o cardápio deixa de oferecer Pix, e nada
   * na tela diria por quê. Uma chamada com timeout curto, numa página que já é
   * `force-dynamic` e já faz o mesmo pelo iFood.
   *
   * O token sai do `accessTokenFor`, e não do `read`, porque o do Mercado Pago
   * vale cerca de 180 dias: ler o valor cru faria a tela anunciar "precisa
   * reconectar" a cada semestre para todo lojista, com o refresh token parado
   * ao lado resolvendo sozinho. Fora da margem de renovação isto é o mesmo que
   * ler.
   */
  const tokenMp =
    mercadoPago && env().mercadoPagoEnabled
      ? await mercadoPagoAccessTokenFor(store, session.establishmentId)().catch(
          (cause: unknown) => {
            /*
             * Credencial ilegível, token vencido sem refresh, ou renovação
             * recusada. Para o dono os três dizem a mesma coisa — reconecte —
             * mas o log precisa distinguir, porque só um deles é problema de
             * configuração nossa.
             */
            console.error('[integracoes] Mercado Pago sem token válido', {
              establishmentId: session.establishmentId,
              cause: String(cause),
            });
            return null;
          },
        )
      : null;

  const contaMp = tokenMp ? await lerContaMercadoPago(tokenMp) : null;

  const estadoMp: EstadoMercadoPago = !mercadoPago
    ? 'desconectado'
    : !contaMp
      ? 'reconectar'
      : mercadoPago.liveMode === false
        ? 'teste'
        : 'conectado';

  const nomeDaLoja = ifood?.merchantId ? await buscarNome(ifood) : null;

  /*
   * Só consulta as lojas do aiqfome quando ainda não há uma escolhida. Com a
   * loja definida, essa chamada seria uma ida à rede a cada abertura da tela
   * para exibir uma lista que ninguém vai usar.
   */
  const lojasAiq = aiqfome && !aiqfome.merchantId
    ? await listarLojasAiqfome(aiqfome.accessToken)
    : [];

  const nomeAiq =
    aiqfome?.merchantId
      ? (lojasAiq.find((l) => l.id === aiqfome.merchantId)?.nome ?? aiqfome.merchantId)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Integrações</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pedido entra sem digitação. Dinheiro do cardápio cai na conta da loja.
        </p>
      </div>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Plataformas de pedido
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          iFood e aiqfome. O pedido chega aqui sozinho.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <IfoodConnect
            conectado={Boolean(ifood)}
            lojaAtual={ifood?.merchantId ? { id: ifood.merchantId, nome: nomeDaLoja } : null}
          />

          <AiqfomeConnect
            conectado={Boolean(aiqfome)}
            lojaAtual={aiqfome ? { id: aiqfome.merchantId ?? '', nome: nomeAiq } : null}
            lojas={lojasAiq}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">Pagamento</h2>
        <p className="mt-1 text-sm text-ink-muted">
          A conta do Mercado Pago que recebe o Pix e o cartão do cardápio.
        </p>
        <div className="mt-3 max-w-xl">
          <MercadoPagoConnect
            estado={estadoMp}
            conta={contaMp ? { nome: contaMp.nome, email: contaMp.email } : null}
            disponivel={env().mercadoPagoEnabled}
            oauthDisponivel={env().mercadoPagoOAuthEnabled}
            prodDisponivel={env().mercadoPagoProdEnabled}
            testeDisponivel={env().mercadoPagoTestEnabled}
            aviso={resultadoMp ?? null}
          />
        </div>
      </section>
    </div>
  );
}

/**
 * O nome da loja não fica guardado, só o id. Buscar aqui evita mais uma coluna
 * para manter em sincronia — e se a chamada falhar, a tela mostra o id, que já
 * diz ao dono que existe uma loja conectada.
 */
async function buscarNome(credencial: { accessToken: string; merchantId?: string | null }) {
  try {
    const resposta = await fetch(
      `https://merchant-api.ifood.com.br/merchant/v1.0/merchants/${credencial.merchantId}`,
      {
        headers: { authorization: `Bearer ${credencial.accessToken}` },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!resposta.ok) return null;
    const loja = (await resposta.json()) as { name?: string };
    return loja.name ?? null;
  } catch {
    return null;
  }
}
