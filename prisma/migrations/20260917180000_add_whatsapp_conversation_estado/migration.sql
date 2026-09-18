-- Onde a conversa do WhatsApp parou: passo, carrinho e loja em foco.
--
-- Escrita à mão, como as anteriores, e pelo mesmo motivo: o `migrate dev` traz
-- junto um DROP INDEX em "Product" e um DROP DEFAULT em "OrderItem".options —
-- drift que já existia entre schema e banco, sem relação com isto. O índice
-- sustenta a ordenação do catálogo.
--
-- Anulável de propósito: toda conversa que já existe entra sem estado, e
-- `lerEstado` trata isso como começo de conversa.

-- AlterTable
ALTER TABLE "WhatsappConversation" ADD COLUMN "estado" JSONB;
