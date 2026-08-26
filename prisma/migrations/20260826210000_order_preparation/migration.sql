-- Etapas de preparo, entre "chegou" e "saiu para entrega".
ALTER TABLE "Order" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "readyAt" TIMESTAMP(3);

-- Novos tipos de aviso ao marketplace.
ALTER TYPE "MarketplaceCommandKind" ADD VALUE 'CONFIRM';
ALTER TYPE "MarketplaceCommandKind" ADD VALUE 'READY';
