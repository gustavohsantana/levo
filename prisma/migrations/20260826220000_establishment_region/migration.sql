-- Cidade e estado entram em toda busca de endereco.
ALTER TABLE "Establishment" ADD COLUMN "city" TEXT;
ALTER TABLE "Establishment" ADD COLUMN "state" TEXT;

-- O piloto opera em Pouso Alegre; sem isto os pedidos existentes continuariam
-- sendo procurados no pais inteiro.
UPDATE "Establishment" SET "city" = 'Pouso Alegre', "state" = 'MG' WHERE "city" IS NULL;
