-- O numero curto do pedido na plataforma de origem.
-- Nulo para pedido manual e para o que foi importado antes desta coluna.
ALTER TABLE "Order" ADD COLUMN "displayId" TEXT;
