-- CreateEnum
CREATE TYPE "OrderSourceKind" AS ENUM ('MANUAL', 'WEBHOOK', 'IFOOD', 'AIQFOME');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'IN_ROUTE', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "StopStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "source" "OrderSourceKind" NOT NULL,
    "externalId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "address" TEXT NOT NULL,
    "reference" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "trackingToken" TEXT NOT NULL,
    "routeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "accessToken" TEXT NOT NULL,
    "geometry" TEXT,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "baselineDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "StopStatus" NOT NULL DEFAULT 'PENDING',
    "etaSeconds" INTEGER NOT NULL DEFAULT 0,
    "legDistanceMeters" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierPing" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEventLog" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "cacheKey" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("cacheKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_establishmentId_idx" ON "User"("establishmentId");

-- CreateIndex
CREATE INDEX "Courier_establishmentId_active_idx" ON "Courier"("establishmentId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");

-- CreateIndex
CREATE INDEX "Order_establishmentId_status_createdAt_idx" ON "Order"("establishmentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_establishmentId_createdAt_idx" ON "Order"("establishmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_establishmentId_source_externalId_key" ON "Order"("establishmentId", "source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_accessToken_key" ON "Route"("accessToken");

-- CreateIndex
CREATE INDEX "Route_establishmentId_status_createdAt_idx" ON "Route"("establishmentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Route_courierId_status_idx" ON "Route"("courierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_orderId_key" ON "RouteStop"("orderId");

-- CreateIndex
CREATE INDEX "RouteStop_routeId_status_idx" ON "RouteStop"("routeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_position_key" ON "RouteStop"("routeId", "position");

-- CreateIndex
CREATE INDEX "CourierPing_routeId_recordedAt_idx" ON "CourierPing"("routeId", "recordedAt");

-- CreateIndex
CREATE INDEX "DomainEventLog_establishmentId_name_occurredAt_idx" ON "DomainEventLog"("establishmentId", "name", "occurredAt");

-- CreateIndex
CREATE INDEX "DomainEventLog_establishmentId_occurredAt_idx" ON "DomainEventLog"("establishmentId", "occurredAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courier" ADD CONSTRAINT "Courier_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierPing" ADD CONSTRAINT "CourierPing_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEventLog" ADD CONSTRAINT "DomainEventLog_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
