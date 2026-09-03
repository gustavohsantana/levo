import { NextResponse, after } from 'next/server';
import { ForbiddenError } from '@/core';
import { containerFor } from '@/composition-root';
import { env } from '@/env';
import { verifyMercadoPagoWebhookSignature } from '@/infrastructure/payments/mercadopago/webhook-signature';
import { resolverIdPagamentoMp } from '@/infrastructure/payments/mercadopago/gateway';
import { CredentialStore } from '@/infrastructure/integrations/credential-store';
import { mercadoPagoAccessTokenFor } from '@/infrastructure/payments/mercadopago/factory';
import {
  getPrismaClient,
  getPrismaClientSemGuardaDeInquilino,
} from '@/infrastructure/persistence/prisma/client';
import { toErrorResponse } from '@/presentation/http/error-mapper';

/**
 * Notificações de pagamento do Mercado Pago.
 *
 * Responde rápido e grava o evento — igual ao webhook do iFood. Confirmar o
 * pagamento e liberar o pedido vem depois (ConfirmPayment); aqui só registramos
 * que algo mudou no gateway.
 */
export async function GET() {
  /*
   * Abrir a URL no navegador manda GET. Sem isto o dono vê 404 ao colar o
   * endereço no painel, mesmo com a rota certa para POST.
   */
  return NextResponse.json({
    ok: true,
    endpoint: 'mercadopago-payment-webhook',
    method: 'POST',
  });
}

/**
 * O access token do lojista dono do pagamento.
 *
 * Passa pelo `CredentialStore`, que decifra e renova quando está perto de
 * vencer — o token do Mercado Pago dura cerca de 180 dias, então na prática
 * isso acontece raramente, mas quando acontece é aqui.
 */
/** O cliente sem guarda, para as consultas que descobrem de quem é o pagamento. */
function entreLojas() {
  return getPrismaClientSemGuardaDeInquilino(env().DATABASE_URL);
}

async function tokenDoLojista(establishmentId: string): Promise<string> {
  const store = new CredentialStore(getPrismaClient(env().DATABASE_URL), env().AUTH_SECRET);
  return mercadoPagoAccessTokenFor(store, establishmentId)();
}

export async function POST(request: Request) {
  try {
    const secret = env().MERCADO_PAGO_WEBHOOK_SECRET;
    const url = new URL(request.url);
    const dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id');
    const raw = await request.text();

    if (secret) {
      verifyMercadoPagoWebhookSignature({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId,
        secret,
      });
    } else {
      console.warn('[mercadopago/webhook] MERCADO_PAGO_WEBHOOK_SECRET ausente — evento aceito sem validar');
    }

    let payload: Record<string, unknown> = {};
    if (raw) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        payload = { raw };
      }
    }

    const data = payload.data as { id?: string | number } | undefined;
    const resourceId = dataId ?? (data?.id != null ? String(data.id) : null);
    const action = typeof payload.action === 'string' ? payload.action : 'notification';
    const type = typeof payload.type === 'string' ? payload.type : 'unknown';
    const requestId = request.headers.get('x-request-id');

    const externalEventId =
      requestId ?? `${type}-${action}-${resourceId ?? 'sem-id'}-${Date.now()}`;

    if (resourceId) {
      const prisma = getPrismaClient(env().DATABASE_URL);

      /*
       * `upsert`, e não `create`.
       *
       * O Mercado Pago reentrega a mesma notificação quando não recebe 200 — e
       * `externalEventId` é único. Com `create`, a reentrega batia na constraint,
       * virava 500, e o MP reentregava de novo: erro permanente, por conta
       * própria. Pior: como este é o PRIMEIRO passo do bloco, a confirmação lá
       * embaixo nunca chegava a rodar. O pagamento entrava e o pedido ficava
       * parado para sempre.
       */
      await prisma.integrationEvent.upsert({
        where: {
          provider_externalEventId: { provider: 'MERCADO_PAGO', externalEventId },
        },
        create: {
          provider: 'MERCADO_PAGO',
          externalEventId,
          code: `${type}:${action}`,
          externalOrderId: resourceId,
          payload,
        },
        // Reentrega não é fato novo: guarda o corpo mais recente e segue.
        update: { payload },
      });

      let registro = await prisma.payment.findUnique({
        where: {
          provider_externalId: { provider: 'MERCADO_PAGO', externalId: resourceId },
        },
        select: { establishmentId: true },
      });

      let paymentId = resourceId;

      const collectorId =
        payload.user_id != null
          ? String(payload.user_id)
          : typeof payload.userId === 'string' || typeof payload.userId === 'number'
            ? String(payload.userId)
            : null;

      /*
       * O `user_id` da notificação é a conta que recebeu — o lojista. É por ele
       * que se descobre de quem é o pagamento **antes** de precisar falar com o
       * Mercado Pago, e é o que torna este webhook multi-loja.
       */
      if (!registro && collectorId) {
        /*
         * Esta é a consulta que não tem estabelecimento para dar — ela é a que
         * descobre o estabelecimento. Por isso usa o cliente sem guarda: com o
         * cliente normal, a guarda derrubava aqui e o webhook devolvia 500 em
         * todo pagamento cuja loja ainda não fosse conhecida.
         */
        const loja = await entreLojas().integrationCredential.findFirst({
          where: { provider: 'MERCADO_PAGO', merchantId: collectorId },
          select: { establishmentId: true },
        });
        if (loja) registro = loja;
      }

      /*
       * O token é o do lojista, não o da nossa aplicação.
       *
       * Consultar o pagamento de um cliente com o token de outra conta devolve
       * 404 — e com uma loja só isso passa despercebido, porque as duas contas
       * são a mesma. O token do `.env` fica como último recurso, para o caso em
       * que a notificação chega sem `user_id` e sem pagamento conhecido; aí é a
       * única chance de descobrir de quem é.
       */
      const token = registro
        ? await tokenDoLojista(registro.establishmentId).catch(() => null)
        : env().MERCADO_PAGO_ACCESS_TOKEN;

      if (!registro && token) {
        const resolvido = await resolverIdPagamentoMp(token, resourceId);
        paymentId = resolvido.paymentId;

        registro = await prisma.payment.findUnique({
          where: {
            provider_externalId: { provider: 'MERCADO_PAGO', externalId: paymentId },
          },
          select: { establishmentId: true },
        });

        if (!registro && resolvido.orderId) {
          // `Payment.orderId` é único, então `findUnique` responde o mesmo sem
          // esbarrar na guarda — que aqui derrubava o caminho inteiro.
          const linha = await prisma.payment.findUnique({
            where: { orderId: resolvido.orderId },
            select: { establishmentId: true, provider: true },
          });
          if (linha?.provider === 'MERCADO_PAGO') {
            registro = { establishmentId: linha.establishmentId };
          }
        }

        if (!registro) {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
            // Sem teto, um Mercado Pago lento segurava o webhook até o limite da
            // plataforma — e cada tentativa presa ocupava uma conexão do banco.
            signal: AbortSignal.timeout(8_000),
          });
          if (mpRes.ok) {
            const mp = (await mpRes.json()) as { external_reference?: string };
            if (mp.external_reference) {
              const porReferencia = await prisma.payment.findUnique({
                where: { orderId: mp.external_reference },
                select: { establishmentId: true, provider: true },
              });
              if (porReferencia?.provider === 'MERCADO_PAGO') {
                registro = { establishmentId: porReferencia.establishmentId };
              }
            }
          }
        }
      }

      if (registro) {
        /*
         * `after()` em vez de promessa solta.
         *
         * A resposta precisa sair rápido — o Mercado Pago reentrega o que demora
         * — mas soltar a promessa e responder deixava o trabalho à mercê do
         * congelamento da função: em serverless a execução pode ser suspensa
         * assim que a resposta sai, às vezes no meio de uma transação já aberta.
         * O cliente pagava, respondíamos 200 em 40ms, e a confirmação
         * simplesmente não acontecia. `after()` é a promessa que a plataforma
         * espera terminar depois de responder.
         */
        const estabelecimento = registro.establishmentId;
        const idDoPagamento = paymentId;

        after(async () => {
          try {
            await containerFor(estabelecimento).useCases.confirmPayment.execute({
              externalId: idDoPagamento,
            });
          } catch (cause) {
            console.error('[mercadopago/webhook] falha ao confirmar pagamento', cause);
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (cause) {
    if (cause instanceof ForbiddenError) {
      return NextResponse.json({ error: cause.message }, { status: 401 });
    }
    return toErrorResponse(cause);
  }
}
