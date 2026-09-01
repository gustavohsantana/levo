-- Grupos de opcao: tamanhos, sabores, bordas, adicionais.
-- Vivem no estabelecimento e sao compartilhados entre produtos.
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionGroup" (
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("productId","groupId")
);

CREATE INDEX "OptionGroup_establishmentId_name_idx" ON "OptionGroup"("establishmentId", "name");
CREATE INDEX "Option_groupId_position_idx" ON "Option"("groupId", "position");
CREATE INDEX "ProductOptionGroup_productId_position_idx" ON "ProductOptionGroup"("productId", "position");

ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Option" ADD CONSTRAINT "Option_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
