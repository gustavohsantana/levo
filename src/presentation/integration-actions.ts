'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ConfigurationError } from '@/core';
import { env } from '@/env';
import { IfoodAuth } from '@/infrastructure/integrations/ifood/auth';
import { Food99Auth } from '@/infrastructure/integrations/99food/auth';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { listarLojasAiqfome } from '@/infrastructure/integrations/aiqfome/stores';
import {
  contaAceitaPix,
  lerContaMercadoPago,
} from '@/infrastructure/payments/mercadopago/account';
import { mercadoPagoEnvCredentials } from '@/infrastructure/payments/mercadopago/factory';
import { getPrismaClient } from '@/infrastructure/persistence/prisma/client';
import { requireSession } from './http/session';
import { toFormError } from './http/error-mapper';
import {
  AVISO_INTEGRACAO_SEM_CREDENCIAL,
  ifoodPronto,
} from './integracao-disponivel';

/**
 * Conectar o iFood pela tela, não pelo terminal.
 *
 * O fluxo distribuído do iFood tem uma ida e volta que não dá para automatizar:
 * o lojista precisa digitar um código no Portal do Parceiro e trazer de volta
 * um código de autorização. O que o produto pode fazer é tornar isso legível —
 * gerar o código, mostrar o link e receber a resposta num campo.
 *
 * Antes disso a vinculação exigia rodar um script pelo terminal, o que na
 * prática significava que só quem escreveu o sistema conseguia conectar um
 * cliente.
 */
const COOKIE_VERIFIER = 'levo_ifood_verifier';

/**
 * Quanto tempo o `verifier` sobrevive — de propósito, mais que o código.
 *
 * O *userCode* vale dez minutos no iFood; o **código de autorização** que o
 * portal devolve depois tem validade própria. Amarrar o cookie aos dez minutos
 * fazia a tela desistir enquanto o iFood ainda aceitaria a troca, e com uma
 * mensagem que culpava o código — mandando o lojista refazer um passo que
 * estava certo.
 *
 * Meia hora cobre o caminho real: aprovar permissão no portal, achar a tela
 * certa, voltar. Se o código de fato venceu, quem diz isso é o iFood, e a
 * mensagem dele é mais confiável que o nosso palpite.
 */
const TTL_SEGUNDOS = 60 * 30;

export type InicioVinculacao =
  | { ok: true; userCode: string; verificationUrl: string; expiraEmMinutos: number }
  | { ok: false; error: string };

function auth(): IfoodAuth {
  const config = env();

  if (!ifoodPronto(config)) {
    throw new ConfigurationError(AVISO_INTEGRACAO_SEM_CREDENCIAL);
  }

  return new IfoodAuth({
    clientId: config.IFOOD_CLIENT_ID,
    clientSecret: config.IFOOD_CLIENT_SECRET,
  });
}

export async function iniciarVinculacaoIfood(): Promise<InicioVinculacao> {
  try {
    await requireSession();

    const { userCode, authorizationCodeVerifier, verificationUrl, expiresInSeconds } =
      await auth().requestUserCode();

    /*
     * O `verifier` precisa sobreviver até o segundo passo, e é secreto: quem o
     * tiver, junto com o código de autorização, fecha a vinculação. Vai em
     * cookie httpOnly em vez de campo escondido no formulário, que o navegador
     * entrega a qualquer script da página.
     */
    (await cookies()).set(COOKIE_VERIFIER, authorizationCodeVerifier, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env().isProduction,
      path: '/',
      maxAge: TTL_SEGUNDOS,
    });

    return {
      ok: true,
      userCode,
      verificationUrl,
      expiraEmMinutos: Math.round(expiresInSeconds / 60),
    };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export type FimVinculacao =
  | { ok: true; lojas: Array<{ id: string; nome: string }> }
  | { ok: false; error: string };

export async function concluirVinculacaoIfood(
  authorizationCode: string,
): Promise<FimVinculacao> {
  try {
    const session = await requireSession();
    const jar = await cookies();
    const verifier = jar.get(COOKIE_VERIFIER)?.value;

    if (!verifier) {
      return {
        ok: false,
        error:
          'Esta vinculação expirou ou foi iniciada em outro navegador. ' +
          'Gere um novo código de conexão e refaça, sem fechar esta aba.',
      };
    }

    const codigo = authorizationCode.trim();
    if (!codigo) return { ok: false, error: 'Cole o código de autorização do portal.' };

    const tokens = await auth().exchangeAuthorizationCode({
      authorizationCode: codigo,
      authorizationCodeVerifier: verifier,
    });

    // Um só uso: o verifier não serve para uma segunda tentativa.
    jar.delete(COOKIE_VERIFIER);

    const lojas = await buscarLojas(tokens.accessToken);

    if (lojas.length === 0) {
      return {
        ok: false,
        error: 'Nenhuma loja encontrada nesta conta do iFood.',
      };
    }

    const prisma = getPrismaClient(env().DATABASE_URL);
    const store = new CredentialStore(prisma, env().AUTH_SECRET);

    /*
     * Com uma loja só, vincula direto. Com mais de uma, grava o acesso e deixa
     * o dono escolher — pedir para ele decidir antes de a gente sequer saber o
     * nome das lojas seria pedir que adivinhasse.
     */
    await store.save(session.establishmentId, 'IFOOD', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      merchantId: lojas.length === 1 ? lojas[0].id : null,
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true, lojas };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function escolherLojaIfood(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);
    const store = new CredentialStore(prisma, env().AUTH_SECRET);

    const atual = await store.read(session.establishmentId, 'IFOOD');
    if (!atual) return { ok: false, error: 'Conecte a conta do iFood primeiro.' };

    await store.save(session.establishmentId, 'IFOOD', { ...atual, merchantId });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function desconectarIfood(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);

    await prisma.integrationCredential.deleteMany({
      where: { establishmentId: session.establishmentId, provider: 'IFOOD' },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

async function buscarLojas(accessToken: string): Promise<Array<{ id: string; nome: string }>> {
  const resposta = await fetch('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });

  if (resposta.ok) {
    const lojas = (await resposta.json()) as Array<{ id: string; name?: string }>;

    if (Array.isArray(lojas) && lojas.length > 0) {
      return lojas.map((loja) => ({ id: loja.id, nome: loja.name ?? loja.id }));
    }
  }

  /*
   * Sem o módulo Merchant, `/merchants` responde 200 com lista vazia — e a
   * vinculação morria aí, dizendo que a conta não tem loja. Tinha: o id estava
   * dentro do próprio token o tempo todo.
   *
   * O iFood carimba em `merchant_scope` as lojas que autorizaram o aplicativo,
   * no formato `id:modulo`. É a fonte mais confiável que existe para isto — não
   * depende de nenhum módulo extra e vem assinada.
   */
  return lojasDoToken(accessToken);
}

/**
 * As lojas que o token declara, lidas do claim `merchant_scope`.
 *
 * Sem nome: o endpoint que teria o nome é justamente o que não responde. O id
 * aparece na tela, o que já diz ao dono que existe uma loja conectada — e o
 * nome volta sozinho quando o módulo Merchant for concedido.
 */
function lojasDoToken(accessToken: string): Array<{ id: string; nome: string }> {
  const corpo = accessToken.split('.')[1];
  if (!corpo) return [];

  try {
    const claims = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as {
      merchant_scope?: unknown;
    };

    if (!Array.isArray(claims.merchant_scope)) return [];

    const ids = new Set(
      claims.merchant_scope
        .map((entrada) => String(entrada).split(':')[0])
        .filter((id) => id.length > 0),
    );

    return [...ids].map((id) => ({ id, nome: id }));
  } catch {
    return [];
  }
}

/**
 * O aiqfome não tem o vaivém de código do iFood: o lojista é redirecionado,
 * consente e volta. Por isso aqui só existem as ações de depois — escolher a
 * loja e desconectar. O começo é um link para `/api/integrations/aiqfome/connect`,
 * que precisa ser navegação de verdade para o cookie de `state` viajar junto.
 */
export async function lojasAiqfome(): Promise<Array<{ id: string; nome: string }>> {
  try {
    const session = await requireSession();
    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);

    const credencial = await store.read(session.establishmentId, 'AIQFOME');
    if (!credencial) return [];

    return await listarLojasAiqfome(credencial.accessToken);
  } catch {
    return [];
  }
}

export async function escolherLojaAiqfome(
  merchantId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);

    const atual = await store.read(session.establishmentId, 'AIQFOME');
    if (!atual) return { ok: false, error: 'Conecte o aiqfome primeiro.' };

    await store.save(session.establishmentId, 'AIQFOME', { ...atual, merchantId });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function desconectarAiqfome(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();

    await getPrismaClient(env().DATABASE_URL).integrationCredential.deleteMany({
      where: { establishmentId: session.establishmentId, provider: 'AIQFOME' },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Liga o par Public Key + Access Token do `.env` neste estabelecimento.
 *
 * São os nomes do painel: produção e teste são o mesmo tipo de par, em abas
 * diferentes. O token é o **da aplicação**, então quem clicar nisto passa a
 * receber naquela conta — não na dele.
 *
 * Isso é atalho de piloto, e por isso não existe em produção. Com dois
 * lojistas, os dois clicariam e o dinheiro dos dois cairia na mesma conta: o
 * pior tipo de defeito, porque não dá erro nenhum e só aparece no extrato de
 * quem não recebeu. Em produção o caminho é o OAuth, em que cada um autoriza a
 * própria conta.
 */
export async function conectarMercadoPagoDoEnv(
  modo: 'teste' | 'producao',
): Promise<{ ok: boolean; error?: string }> {
  if (env().isProduction) {
    return {
      ok: false,
      error:
        'Em produção, cada loja conecta a própria conta do Mercado Pago. ' +
        'Use "Conectar Mercado Pago".',
    };
  }

  try {
    const credencial = mercadoPagoEnvCredentials(modo);
    if (!credencial) {
      return {
        ok: false,
        error:
          modo === 'teste'
            ? 'Public Key e Access Token de teste não estão neste ambiente.'
            : 'Public Key e Access Token de produção não estão neste ambiente.',
      };
    }

    const session = await requireSession();
    const [conta, aceitaPix] = await Promise.all([
      lerContaMercadoPago(credencial.accessToken),
      contaAceitaPix(credencial.accessToken),
    ]);

    if (!conta) {
      return {
        ok: false,
        error: 'O Mercado Pago não reconheceu o Access Token. Confira o par no .env.',
      };
    }

    /*
     * Conta de teste quase nunca lista Pix. Cobrança sandbox não depende disso.
     * Produção recusa: sem Pix a primeira cobrança de verdade falha no cliente.
     */
    if (aceitaPix === false && modo === 'teste') {
      console.info('[mercadopago] conta de teste sem Pix na lista de meios — seguindo mesmo assim', {
        userId: conta.id,
      });
    } else if (aceitaPix === false) {
      return {
        ok: false,
        error:
          'Esta conta do Mercado Pago não tem chave Pix cadastrada. Cadastre uma no aplicativo e tente de novo.',
      };
    }

    const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);
    await store.save(session.establishmentId, 'MERCADO_PAGO', {
      accessToken: credencial.accessToken,
      refreshToken: null,
      expiresAt: null,
      publicKey: credencial.publicKey,
      liveMode: modo === 'producao',
      merchantId: conta.id,
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * O Mercado Pago segue a forma do aiqfome — redireciona, consente e volta — mas
 * desconectar aqui não é a mesma coisa que nos marketplaces.
 *
 * Lá, desconectar para de importar pedido. Aqui, tira a opção de pagar online do
 * cardápio no mesmo instante. Por isso a ação apaga a credencial e nada mais:
 * pedido já pago continua pago, e o histórico não some junto.
 *
 * Apagar não revoga a autorização do lado do Mercado Pago. Quem quiser cortar de
 * verdade faz isso na conta dele; do lado do Levô, sem credencial não há como
 * cobrar, que é o efeito que o dono espera do botão.
 */
export async function desconectarMercadoPago(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();

    await getPrismaClient(env().DATABASE_URL).integrationCredential.deleteMany({
      where: { establishmentId: session.establishmentId, provider: 'MERCADO_PAGO' },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/* ---------------------------------------------------------------------------
 * 99Food (DiDi Food Open Platform)
 *
 * O vínculo aqui não se parece com o do iFood nem com o do aiqfome. Não há
 * código para transcrever nem redirecionamento de volta: a plataforma devolve
 * uma URL, o lojista autoriza lá dentro, e do lado de cá não chega aviso
 * nenhum. Por isso o fluxo tem dois passos separados — gerar o link e, depois,
 * CONFERIR — em vez de um "conectar" que resolveria tudo sozinho.
 *
 * Conferir é pedir o token: se a loja foi autorizada, ele sai; se não, a
 * plataforma responde 10101. É a única fonte de verdade sobre o vínculo.
 * ------------------------------------------------------------------------- */

/** O apelido da loja no Levô quando o lojista não escolhe outro. */
const APP_SHOP_ID_PADRAO = 'lojaprincipal';

function food99Config(): { appId: string; appSecret: string } | null {
  const { FOOD99_APP_ID: appId, FOOD99_APP_SECRET: appSecret } = env();
  return appId && appSecret ? { appId, appSecret } : null;
}

/**
 * A página onde o lojista autoriza a loja.
 *
 * O corpo é montado à mão porque `app_id` é um long de 19 dígitos: passar por
 * `JSON.stringify` com number o arredondaria, e a plataforma recusaria um app
 * que não existe.
 */
export async function gerarLinkFood99(
  appShopId: string = APP_SHOP_ID_PADRAO,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireSession();
    const cfg = food99Config();
    if (!cfg) return { ok: false, error: '99Food não configurado neste ambiente.' };

    const alvo = appShopId.trim() || APP_SHOP_ID_PADRAO;
    const resposta = await fetch(
      'https://openapi.didi-food.com/v1/auth/authorizationpage/getUrl',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: `{"app_id":${cfg.appId},"app_shop_id":${JSON.stringify(alvo)}}`,
        signal: AbortSignal.timeout(20_000),
      },
    );

    const corpo = (await resposta.json()) as {
      errno: number;
      errmsg?: string;
      data?: { url?: string };
    };

    if (corpo.errno !== 0 || !corpo.data?.url) {
      return { ok: false, error: corpo.errmsg ?? `99Food respondeu errno ${corpo.errno}` };
    }

    return { ok: true, url: corpo.data.url };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

/**
 * Pergunta à plataforma se a loja já foi autorizada e, em caso positivo, grava
 * o vínculo.
 *
 * O token dura cerca de dez minutos e é reemitido a qualquer momento só com as
 * credenciais do app — então ele é guardado mais como carimbo de "funcionou" do
 * que como credencial a ser reaproveitada. O que de fato importa guardar é o
 * `merchantId`: é ele que amarra o pedido que chegar pelo webhook a este
 * estabelecimento.
 */
export async function verificarVinculoFood99(
  appShopId: string = APP_SHOP_ID_PADRAO,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const cfg = food99Config();
    if (!cfg) return { ok: false, error: '99Food não configurado neste ambiente.' };

    const alvo = appShopId.trim() || APP_SHOP_ID_PADRAO;

    /*
     * Passa pelo `Food99Auth` em vez de chamar o `get` na mão: é ele que conhece
     * a sequência `get → refresh → get`. Autorização apenas vencida (10102) se
     * cura sozinha aqui, sem o lojista precisar reabrir o link.
     */
    const auth = new Food99Auth({ appId: cfg.appId, appSecret: cfg.appSecret });

    let token: { authToken: string; expiraEm: Date | null };
    try {
      token = await auth.token(alvo);
    } catch (cause) {
      /*
       * A mensagem nomeia o apelido tentado.
       *
       * Sem isso, quem deixou o campo no valor padrão via "a loja ainda não foi
       * autorizada" e ia reabrir o link — quando o problema era estar
       * perguntando por outra loja. O erro precisa dizer o que foi perguntado.
       */
      const errno = (cause as { details?: { errno?: number } })?.details?.errno;
      const motivo =
        errno === 10101
          ? `Nenhuma loja autorizada com o apelido "${alvo}". Confira se é esse mesmo o apelido usado na autorização, ou abra o link acima e autorize.`
          : errno === 10102
            ? `A autorização de "${alvo}" venceu e não foi possível renovar. Abra o link acima e autorize de novo.`
            : toFormError(cause);
      return { ok: false, error: motivo };
    }

    const prisma = getPrismaClient(env().DATABASE_URL);
    const store = new CredentialStore(prisma, env().AUTH_SECRET);

    await store.save(session.establishmentId, 'FOOD99', {
      accessToken: token.authToken,
      refreshToken: null,
      expiresAt: token.expiraEm,
      merchantId: alvo,
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}

export async function desconectarFood99(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const prisma = getPrismaClient(env().DATABASE_URL);

    await prisma.integrationCredential.deleteMany({
      where: { establishmentId: session.establishmentId, provider: 'FOOD99' },
    });

    revalidatePath('/dashboard/integracoes');
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: toFormError(cause) };
  }
}
