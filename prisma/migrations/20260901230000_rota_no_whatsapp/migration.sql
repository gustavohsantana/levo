-- Rota no WhatsApp do motoboy.
--
-- Desligado por padrao: mensagem automatica sai de um numero que pode ser
-- banido, e ligar isso e decisao do dono.
ALTER TABLE "Establishment" ADD COLUMN "whatsappRoutes" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CourierNotification" (
  "id" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  CONSTRAINT "CourierNotification_pkey" PRIMARY KEY ("id")
);

-- Uma mensagem por rota: replanejar nao manda dois WhatsApp.
CREATE UNIQUE INDEX "CourierNotification_routeId_key" ON "CourierNotification"("routeId");
CREATE INDEX "CourierNotification_establishmentId_sentAt_idx"
  ON "CourierNotification"("establishmentId", "sentAt");

ALTER TABLE "CourierNotification" ADD CONSTRAINT "CourierNotification_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
