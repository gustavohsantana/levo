import { ConfigurationError, type Logger } from '@/core';
import { env } from '@/env';
import { Food99Auth } from './auth';
import { Food99Pedidos } from './pedidos';
import {
  Food99OrderSource,
  type EventoPendenteFood99,
  type FilaDeEventosFood99,
} from './adapter';

/** O mínimo do Prisma que a fila usa. Evita arrastar o client inteiro no tipo. */
interface ClienteDeEventos {
  integrationEvent: {
    findMany(args: unknown): Promise<
      { id: string; code: string; externalOrderId: string }[]
    >;
    updateMany(args: unknown): Promise<unknown>;
  };
}

/**
 * Quantos eventos por ciclo.
 *
 * Cada um pode custar uma chamada de detalhe à plataforma. Um teto evita que
 * uma fila represada (banco fora por uma hora, por exemplo) vire uma rajada de
 * centenas de requisições no primeiro ciclo depois que ela volta.
 */
const POR_CICLO = 50;

/**
 * A fila de entrada do 99Food, apoiada na tabela de eventos.
 *
 * `merchantId` guarda o `app_shop_id` que veio no webhook — o filtro por loja
 * existe porque um dia haverá mais de uma no mesmo banco, e importar o pedido
 * de uma loja no painel de outra é o erro que não se descobre olhando a tela.
 *
 * ⚠️ O evento **sem** `app_shop_id` entra também. A especificação deles não
 * garante o campo no push, e um filtro estrito transformaria essa omissão em
 * "nenhum pedido chega", sem erro em lugar nenhum — o pior modo de falhar. O
 * preço é conhecido: no dia em que houver duas lojas 99Food no mesmo banco, um
 * evento anônimo cai na primeira que drenar a fila. Quando a homologação
 * mostrar um push real com o campo, este `OR` sai daqui.
 */
export function filaDeEventosFood99(prisma: ClienteDeEventos): FilaDeEventosFood99 {
  return {
    async pendentes(appShopId: string): Promise<EventoPendenteFood99[]> {
      return prisma.integrationEvent.findMany({
        where: {
          provider: 'FOOD99',
          processedAt: null,
          OR: [{ merchantId: appShopId }, { merchantId: null }],
        },
        // Mais antigo primeiro: pedido chega em ordem, e inverter isso faria a
        // cozinha ver o das 20h05 antes do das 20h00.
        orderBy: { receivedAt: 'asc' },
        take: POR_CICLO,
        select: { id: true, code: true, externalOrderId: true },
      });
    },

    async concluir(eventIds: string[]): Promise<void> {
      if (eventIds.length === 0) return;
      await prisma.integrationEvent.updateMany({
        where: { id: { in: eventIds } },
        data: { processedAt: new Date() },
      });
    },
  };
}

/**
 * O importador de pedidos do 99Food para uma loja.
 *
 * `appShopId` é o id da loja no NOSSO sistema — o mesmo valor que o lojista
 * amarrou na página de autorização e que o webhook devolve em `app_shop_id`. Se
 * os dois divergirem, a fila fica cheia e nada é importado: é por isso que ele
 * vem de um lugar só, a credencial gravada na conexão.
 */
export function food99OrderSourceFor(
  prisma: ClienteDeEventos,
  appShopId: string,
  logger?: Logger,
): Food99OrderSource {
  const config = env();

  if (!config.FOOD99_APP_ID || !config.FOOD99_APP_SECRET) {
    throw new ConfigurationError(
      '99Food: FOOD99_APP_ID e FOOD99_APP_SECRET são obrigatórios para importar pedidos',
    );
  }

  const auth = new Food99Auth({
    appId: config.FOOD99_APP_ID,
    appSecret: config.FOOD99_APP_SECRET,
    baseUrl: config.FOOD99_BASE_URL,
    logger,
  });

  return new Food99OrderSource({
    pedidos: new Food99Pedidos({
      auth,
      appShopId,
      baseUrl: config.FOOD99_BASE_URL,
      logger,
    }),
    appShopId,
    fila: filaDeEventosFood99(prisma),
    logger,
  });
}
