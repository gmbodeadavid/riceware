-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "batchId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "lotCoquesId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "orderId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "packLotId" TEXT;

-- CreateTable
CREATE TABLE "BatchMaterialUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "lotCoquesId" TEXT NOT NULL,
    "kgUsed" REAL,
    "estimated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BatchMaterialUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchProduction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BatchMaterialUsage_lotCoquesId_fkey" FOREIGN KEY ("lotCoquesId") REFERENCES "LotCoques" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'quarantaine',
    "packedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "PackLot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchProduction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PackLot_packId_fkey" FOREIGN KEY ("packId") REFERENCES "ProductPack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderLineAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderLineId" TEXT NOT NULL,
    "packLotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "OrderLineAllocation_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderLineAllocation_packLotId_fkey" FOREIGN KEY ("packLotId") REFERENCES "PackLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BatchMaterialUsage_lotCoquesId_idx" ON "BatchMaterialUsage"("lotCoquesId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchMaterialUsage_batchId_lotCoquesId_key" ON "BatchMaterialUsage"("batchId", "lotCoquesId");

-- CreateIndex
CREATE UNIQUE INDEX "PackLot_code_key" ON "PackLot"("code");

-- CreateIndex
CREATE INDEX "PackLot_batchId_idx" ON "PackLot"("batchId");

-- CreateIndex
CREATE INDEX "PackLot_packId_idx" ON "PackLot"("packId");

-- CreateIndex
CREATE INDEX "OrderLineAllocation_packLotId_idx" ON "OrderLineAllocation"("packLotId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLineAllocation_orderLineId_packLotId_key" ON "OrderLineAllocation"("orderLineId", "packLotId");

-- CreateIndex
CREATE INDEX "StockMovement_lotCoquesId_idx" ON "StockMovement"("lotCoquesId");

-- CreateIndex
CREATE INDEX "StockMovement_batchId_idx" ON "StockMovement"("batchId");

-- CreateIndex
CREATE INDEX "StockMovement_packLotId_idx" ON "StockMovement"("packLotId");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");
