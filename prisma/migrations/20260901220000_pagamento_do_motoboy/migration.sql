-- Como cada motoboy e pago.
--
-- O padrao e POR_ENTREGA com zero: quem nao configurou nada nao passa a dever
-- um numero inventado. A tela mostra "acordo nao definido" ate o dono dizer.
CREATE TYPE "CourierPayModel" AS ENUM ('POR_ENTREGA', 'POR_FAIXA', 'DIARIA_E_ENTREGA');

ALTER TABLE "Courier" ADD COLUMN "payModel" "CourierPayModel" NOT NULL DEFAULT 'POR_ENTREGA';
ALTER TABLE "Courier" ADD COLUMN "payPerDeliveryCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Courier" ADD COLUMN "payDailyCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CourierPayBand" (
  "id" TEXT NOT NULL,
  "courierId" TEXT NOT NULL,
  "uptoMeters" INTEGER NOT NULL,
  "amountCents" INTEGER NOT NULL,
  CONSTRAINT "CourierPayBand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourierPayBand_courierId_uptoMeters_idx" ON "CourierPayBand"("courierId", "uptoMeters");

ALTER TABLE "CourierPayBand" ADD CONSTRAINT "CourierPayBand_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
