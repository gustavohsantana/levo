-- Estado do pareamento do WhatsApp, espelhado pelo worker.
--
-- A WAHA fica presa no localhost da VM e o painel roda na Vercel: uma nao
-- alcanca a outra. O worker ja fala com os dois lados, entao ele e a ponte —
-- e nenhuma porta nova precisa ser aberta para a internet.
CREATE TABLE "WhatsappSession" (
  "establishmentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DESCONHECIDO',
  "qrBase64" TEXT,
  "qrAt" TIMESTAMP(3),
  "pairRequestedAt" TIMESTAMP(3),
  "connectedAs" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("establishmentId")
);

ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
