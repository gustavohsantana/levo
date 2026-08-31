-- Aceitar sozinho o pedido do marketplace. Desligado por padrao: aceitar e um
-- compromisso de producao, e a decisao e do dono da loja.
ALTER TABLE "Establishment" ADD COLUMN "autoConfirmOrders" BOOLEAN NOT NULL DEFAULT false;
