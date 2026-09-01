-- Ordem do cardapio: posicao do produto e ordem das categorias.
--
-- O default 0 deixaria tudo empatado e o desempate cairia no nome, que e
-- exatamente a ordem alfabetica de hoje. Entao o backfill numera cada categoria
-- na ordem atual: ninguem ve o cardapio mudar sozinho, e a partir daqui o dono
-- move o que quiser.
ALTER TABLE "Product" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Establishment" ADD COLUMN "categoryOrder" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product" p
SET "position" = numerada.linha
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "establishmentId", COALESCE("category", '')
           ORDER BY "name" ASC
         ) AS linha
  FROM "Product"
) AS numerada
WHERE p.id = numerada.id;

-- Congela tambem a ordem das categorias que ja existem, pelo mesmo motivo.
UPDATE "Establishment" e
SET "categoryOrder" = COALESCE(cats.nomes, ARRAY[]::TEXT[])
FROM (
  SELECT "establishmentId", ARRAY_AGG(DISTINCT "category" ORDER BY "category") AS nomes
  FROM "Product"
  WHERE "category" IS NOT NULL AND "category" <> ''
  GROUP BY "establishmentId"
) AS cats
WHERE e.id = cats."establishmentId";

CREATE INDEX "Product_establishmentId_position_idx" ON "Product"("establishmentId", "position");
