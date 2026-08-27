-- Mercado Pago como provedor de integração.
--
-- `ALTER TYPE ... ADD VALUE` dentro de transação é permitido no Postgres 12+,
-- mas o valor novo não pode ser *usado* na mesma transação. Por isso esta
-- migration só acrescenta o rótulo e as colunas; nada aqui grava
-- 'MERCADO_PAGO' em lugar nenhum.
ALTER TYPE "IntegrationProvider" ADD VALUE 'MERCADO_PAGO';

-- Chave publicável do provedor. Em claro: ela nasce para ir ao navegador.
ALTER TABLE "IntegrationCredential" ADD COLUMN "publicKey" TEXT;

-- Falso quando a autorização foi contra o ambiente de testes. Nulo para as
-- credenciais que já existem, porque iFood e aiqfome não têm essa distinção.
ALTER TABLE "IntegrationCredential" ADD COLUMN "liveMode" BOOLEAN;
