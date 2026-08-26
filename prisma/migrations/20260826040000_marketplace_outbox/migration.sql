-- Caixa de saída dos avisos ao marketplace.
CREATE TYPE "MarketplaceCommandKind" AS ENUM ('DISPATCH', 'DELIVERED');

CREATE TABLE "MarketplaceCommand" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "command" "MarketplaceCommandKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "MarketplaceCommand_pkey" PRIMARY KEY ("id")
);

-- Um aviso por pedido e tipo: torna o enfileiramento idempotente.
CREATE UNIQUE INDEX "MarketplaceCommand_provider_externalOrderId_command_key"
    ON "MarketplaceCommand"("provider", "externalOrderId", "command");

-- A fila é lida por "pendentes, mais antigos primeiro".
CREATE INDEX "MarketplaceCommand_processedAt_createdAt_idx"
    ON "MarketplaceCommand"("processedAt", "createdAt");

ALTER TABLE "MarketplaceCommand" ADD CONSTRAINT "MarketplaceCommand_establishmentId_fkey"
    FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
