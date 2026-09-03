-- O pedido que o cliente ja ligou cobrando.
--
-- Marcado pelo dono, nunca deduzido pelo sistema: a informacao que decide — que
-- o cliente ligou — nunca chega ao banco. E raro por natureza, entao nao suja o
-- caso comum.
ALTER TABLE "Order" ADD COLUMN "urgentAt" TIMESTAMP(3);
