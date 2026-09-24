/**
 * O que a tela de Integrações pode oferecer de verdade.
 *
 * Sem credencial no servidor, o botão não tem para onde ir. Esconder isso
 * atrás de um clique devolvia "tente novamente" no iFood e um JSON cru no
 * aiqfome — o dono não tem o que tentar de novo. O 99Food já dizia, no
 * próprio cartão, que falta configuração. Os outros dois seguem o mesmo aviso.
 */
export const AVISO_INTEGRACAO_SEM_CREDENCIAL =
  'Ainda não configurado neste ambiente. As credenciais do aplicativo precisam estar no servidor antes de vincular a loja.';

export function ifoodPronto<T extends { IFOOD_CLIENT_ID?: string; IFOOD_CLIENT_SECRET?: string }>(
  config: T,
): config is T & { IFOOD_CLIENT_ID: string; IFOOD_CLIENT_SECRET: string } {
  return Boolean(config.IFOOD_CLIENT_ID && config.IFOOD_CLIENT_SECRET);
}

export function aiqfomePronto(config: {
  aiqfomeEnabled: boolean;
  AIQFOME_CLIENT_ID?: string;
  AIQFOME_CLIENT_SECRET?: string;
}): boolean {
  return (
    config.aiqfomeEnabled && Boolean(config.AIQFOME_CLIENT_ID && config.AIQFOME_CLIENT_SECRET)
  );
}
