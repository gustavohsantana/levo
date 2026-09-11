import type { Logger, MarketplaceCommands } from '@/core';
import type { IntegrationProvider } from '@/generated/prisma';
import { CredentialStore } from './credential-store';
import { IfoodAuth } from './ifood/auth';
import { IfoodOrderSource } from './ifood/adapter';
import { IfoodMerchant } from './ifood/merchant';
import { AiqfomeOrderSource } from './aiqfome/adapter';
import { aiqfomeAccessTokenFor } from './aiqfome/factory';

export interface MarketplaceFactoryConfig {
  IFOOD_CLIENT_ID?: string;
  IFOOD_CLIENT_SECRET?: string;
  AIQFOME_CLIENT_ID?: string;
  AIQFOME_CLIENT_SECRET?: string;
  AIQFOME_BASE_URL?: string;
}

/**
 * O canal para mandar estado de volta à plataforma de origem.
 *
 * Vive aqui, e não no worker, porque agora tem dois donos: o worker esvazia a
 * caixa de saída (confirmar, pronto, despachar) e a aplicação web cancela
 * pedido na hora, com o lojista esperando a resposta na tela. Duplicar esta
 * montagem seria duplicar a decisão de qual credencial usar — o tipo de coisa
 * que passa a divergir na primeira vez que só um dos dois é corrigido.
 *
 * Devolve `null` quando não há credencial: um estabelecimento que nunca
 * conectou não tem para quem avisar, e isso não é falha.
 */
export async function marketplaceCommandsFor(
  store: CredentialStore,
  establishmentId: string,
  provider: IntegrationProvider,
  config: MarketplaceFactoryConfig,
  logger?: Logger,
): Promise<MarketplaceCommands | null> {
  /*
   * Mercado Pago compartilha a tabela de credenciais com os marketplaces, mas
   * não é um: ele não traz pedido para dentro, então não existe status para
   * mandar de volta.
   */
  if (provider === 'MERCADO_PAGO') return null;

  const credencial = await store.read(establishmentId, provider);
  if (!credencial?.merchantId) return null;

  if (provider === 'IFOOD') {
    if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) return null;

    const auth = new IfoodAuth({
      clientId: config.IFOOD_CLIENT_ID,
      clientSecret: config.IFOOD_CLIENT_SECRET,
    });

    return new IfoodOrderSource({
      merchantId: credencial.merchantId,
      accessToken: () => store.accessTokenFor(establishmentId, 'IFOOD', (rt) => auth.refresh(rt)),
      logger,
    });
  }

  if (!config.AIQFOME_CLIENT_ID || !config.AIQFOME_CLIENT_SECRET) return null;

  return new AiqfomeOrderSource({
    accessToken: aiqfomeAccessTokenFor(store, establishmentId),
    storeId: credencial.merchantId,
    baseUrl: config.AIQFOME_BASE_URL,
    logger,
  });
}

/**
 * O cliente Merchant do iFood para um lojista, ou `null` se não conectado.
 *
 * Mesma decisão de credencial do order source — mesmo app, mesmo token do
 * `CredentialStore` — mas para gerir a loja (pausa, horário, disponibilidade)
 * em vez de receber pedido. Reaproveitar a montagem evita os dois divergirem.
 */
export async function ifoodMerchantFor(
  store: CredentialStore,
  establishmentId: string,
  config: MarketplaceFactoryConfig,
  logger?: Logger,
): Promise<{ merchant: IfoodMerchant; merchantId: string } | null> {
  const credencial = await store.read(establishmentId, 'IFOOD');
  if (!credencial?.merchantId) return null;
  if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) return null;

  const auth = new IfoodAuth({
    clientId: config.IFOOD_CLIENT_ID,
    clientSecret: config.IFOOD_CLIENT_SECRET,
  });

  return {
    merchantId: credencial.merchantId,
    merchant: new IfoodMerchant({
      accessToken: () => store.accessTokenFor(establishmentId, 'IFOOD', (rt) => auth.refresh(rt)),
      logger,
    }),
  };
}
