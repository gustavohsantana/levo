-- Complementos do item, separados do nome. Vazio para o que ja existia.
ALTER TABLE "OrderItem" ADD COLUMN "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
