-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "merchantId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Reentrega é normal: o mesmo evento chega de novo quando a confirmação se
-- perde. O índice único é o que impede processá-lo duas vezes.
CREATE UNIQUE INDEX "IntegrationEvent_provider_externalEventId_key" ON "IntegrationEvent"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_processedAt_receivedAt_idx" ON "IntegrationEvent"("processedAt", "receivedAt");
