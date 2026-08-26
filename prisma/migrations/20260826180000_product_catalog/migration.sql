-- Catálogo próprio do estabelecimento.
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" "OrderSourceKind" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- Reimportar do marketplace nao duplica. NULL e distinto de NULL em Postgres,
-- entao produtos manuais convivem sem esbarrar aqui.
CREATE UNIQUE INDEX "Product_establishmentId_source_externalId_key"
    ON "Product"("establishmentId", "source", "externalId");

CREATE INDEX "Product_establishmentId_active_name_idx"
    ON "Product"("establishmentId", "active", "name");

ALTER TABLE "Product" ADD CONSTRAINT "Product_establishmentId_fkey"
    FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
