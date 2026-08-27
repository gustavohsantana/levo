-- Faixas de taxa de entrega por distancia em linha reta.
CREATE TABLE "DeliveryFeeRule" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "uptoMeters" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,

    CONSTRAINT "DeliveryFeeRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryFeeRule_establishmentId_uptoMeters_key"
    ON "DeliveryFeeRule"("establishmentId", "uptoMeters");
CREATE INDEX "DeliveryFeeRule_establishmentId_uptoMeters_idx"
    ON "DeliveryFeeRule"("establishmentId", "uptoMeters");

ALTER TABLE "DeliveryFeeRule" ADD CONSTRAINT "DeliveryFeeRule_establishmentId_fkey"
    FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
