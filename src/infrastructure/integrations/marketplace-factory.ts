import type { Logger, MarketplaceCommands } from '@/core';
import type { IntegrationProvider } from '@/generated/prisma';
import { CredentialStore } from './credential-store';
import { IfoodAuth } from './ifood/auth';
import { IfoodOrderSource } from './ifood/adapter';
import { IfoodMerchant } from './ifood/merchant';
import { IfoodCatalog } from './ifood/catalog';
import { AiqfomeOrderSource } from './aiqfome/adapter';
import { AiqfomeLoja } from './aiqfome/loja';
import { AiqfomeCatalogo } from './aiqfome/catalogo';
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
   * Nem toda credencial guardada aqui é de marketplace.
   *
   * O Mercado Pago não traz pedido para dentro — traz dinheiro. O WhatsApp traz
   * conversa, e o pedido nasce dela: quem confirma é a nossa própria tela, não
   * uma plataforma lá fora esperando aviso. Nos dois casos não existe status
   * para mandar de volta, e devolver `null` é a resposta certa, não uma falta.
   */
  if (provider === 'MERCADO_PAGO' || provider === 'WHATSAPP') return null;

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

/**
 * O cliente Catalog do iFood para um lojista, ou `null` se não conectado.
 *
 * Mesmo app e mesmo token do Merchant — muda só o conjunto de rotas (`/catalog`),
 * para gerir o cardápio (categoria, item, complemento, foto, preço, status).
 */
export async function ifoodCatalogFor(
  store: CredentialStore,
  establishmentId: string,
  config: MarketplaceFactoryConfig,
  logger?: Logger,
): Promise<{ catalog: IfoodCatalog; merchantId: string } | null> {
  const credencial = await store.read(establishmentId, 'IFOOD');
  if (!credencial?.merchantId) return null;
  if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) return null;

  const auth = new IfoodAuth({
    clientId: config.IFOOD_CLIENT_ID,
    clientSecret: config.IFOOD_CLIENT_SECRET,
  });

  return {
    merchantId: credencial.merchantId,
    catalog: new IfoodCatalog({
      merchantId: credencial.merchantId,
      accessToken: () => store.accessTokenFor(establishmentId, 'IFOOD', (rt) => auth.refresh(rt)),
      logger,
    }),
  };
}

/**
 * O cliente Loja do aiqfome para um lojista, ou `null` se não conectado.
 *
 * O paralelo do `ifoodMerchantFor`, mas para o aiqfome: mesmo token do
 * `CredentialStore` (renovado pelo `aiqfomeAccessTokenFor`), para gerir
 * disponibilidade e horário. `storeId` é o `merchantId` guardado na conexão.
 */
export async function aiqfomeLojaFor(
  store: CredentialStore,
  establishmentId: string,
  config: MarketplaceFactoryConfig,
  logger?: Logger,
): Promise<{ loja: AiqfomeLoja; storeId: string } | null> {
  const credencial = await store.read(establishmentId, 'AIQFOME');
  if (!credencial?.merchantId) return null;
  if (!config.AIQFOME_CLIENT_ID || !config.AIQFOME_CLIENT_SECRET) return null;

  return {
    storeId: credencial.merchantId,
    loja: new AiqfomeLoja({
      accessToken: aiqfomeAccessTokenFor(store, establishmentId),
      baseUrl: config.AIQFOME_BASE_URL,
      logger,
    }),
  };
}

/**
 * O cliente Cardápio (Menu) do aiqfome para um lojista, ou `null` se não
 * conectado. Mesmo token do módulo Loja; muda o conjunto de rotas (`/menu`).
 */
export async function aiqfomeCatalogoFor(
  store: CredentialStore,
  establishmentId: string,
  config: MarketplaceFactoryConfig,
  logger?: Logger,
): Promise<{ catalogo: AiqfomeCatalogo; storeId: string } | null> {
  const credencial = await store.read(establishmentId, 'AIQFOME');
  if (!credencial?.merchantId) return null;
  if (!config.AIQFOME_CLIENT_ID || !config.AIQFOME_CLIENT_SECRET) return null;

  return {
    storeId: credencial.merchantId,
    catalogo: new AiqfomeCatalogo({
      accessToken: aiqfomeAccessTokenFor(store, establishmentId),
      baseUrl: config.AIQFOME_BASE_URL,
      logger,
    }),
  };
}
