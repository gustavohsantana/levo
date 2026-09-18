-- WhatsApp (Cloud API da Meta) entra como provedor de integração, e com ele os
-- dois modelos que decidem DE QUAL LOJA é uma conversa.
--
-- Escrita à mão, como a do 99Food e pelo mesmo motivo: o `migrate dev` insiste
-- em trazer junto um DROP INDEX em Product e um DROP DEFAULT em OrderItem.options
-- — drift que já existia entre schema e banco, sem relação nenhuma com isto. O
-- índice sustenta a ordenação do catálogo, e derrubá-lo de carona seria estragar
-- uma consulta quente por engano.

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'WHATSAPP';

-- CreateTable
CREATE TABLE "WhatsappChannel" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayNumber" TEXT,
    "establishmentId" TEXT,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappConversation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappChannel_phoneNumberId_key" ON "WhatsappChannel"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsappChannel_establishmentId_idx" ON "WhatsappChannel"("establishmentId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_establishmentId_idx" ON "WhatsappConversation"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConversation_channelId_customerPhone_key" ON "WhatsappConversation"("channelId", "customerPhone");

-- AddForeignKey
ALTER TABLE "WhatsappChannel" ADD CONSTRAINT "WhatsappChannel_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WhatsappChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
