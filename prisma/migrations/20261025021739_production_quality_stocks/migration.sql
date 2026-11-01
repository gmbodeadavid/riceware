-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reader',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Rizerie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contractType" TEXT NOT NULL DEFAULT 'achat',
    "monthlyVolumeKg" REAL,
    "qualityNotes" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LotCoques" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rizerieId" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "grossWeightKg" REAL NOT NULL,
    "tareWeightKg" REAL NOT NULL DEFAULT 0,
    "netWeightKg" REAL NOT NULL,
    "humidityPct" REAL NOT NULL,
    "visualQuality" TEXT NOT NULL DEFAULT 'conforme',
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LotCoques_rizerieId_fkey" FOREIGN KEY ("rizerieId") REFERENCES "Rizerie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotCoques_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BatchProduction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "lotId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "powderKg" REAL NOT NULL,
    "binderKg" REAL NOT NULL,
    "mixHumidityPct" REAL NOT NULL,
    "pressingTempC" REAL NOT NULL,
    "pressureMpa" REAL NOT NULL,
    "cycleTimeMin" REAL NOT NULL,
    "piecesProduced" INTEGER NOT NULL,
    "rejects" INTEGER NOT NULL DEFAULT 0,
    "rejectCause" TEXT,
    "observations" TEXT,
    "powderCostFcfa" REAL NOT NULL DEFAULT 0,
    "binderCostFcfa" REAL NOT NULL DEFAULT 0,
    "laborCostFcfa" REAL NOT NULL DEFAULT 0,
    "energyCostFcfa" REAL NOT NULL DEFAULT 0,
    "operatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BatchProduction_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "LotCoques" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BatchProduction_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProduitFini" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weightG" REAL NOT NULL,
    "thicknessMm" REAL NOT NULL,
    "thicknessPoints" JSONB,
    "leakTest" BOOLEAN,
    "loadTestKg" REAL,
    "status" TEXT NOT NULL DEFAULT 'valide',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProduitFini_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchProduction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestQualite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produitFiniId" TEXT,
    "batchId" TEXT,
    "typeTest" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "loadKg" REAL,
    "durationMin" REAL,
    "waterMl" REAL,
    "waterTempC" REAL,
    "cracks" BOOLEAN,
    "bubbles" BOOLEAN,
    "deformations" BOOLEAN,
    "thicknessAvgMm" REAL,
    "operatorId" TEXT,
    "testedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestQualite_produitFiniId_fkey" FOREIGN KEY ("produitFiniId") REFERENCES "ProduitFini" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestQualite_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchProduction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestQualite_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemType" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "minThreshold" REAL NOT NULL DEFAULT 0,
    "location" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "resultingQuantity" REAL NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'autre',
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location" TEXT,
    "contractType" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'autre',
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "entityType" TEXT,
    "entityId" TEXT,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT NOT NULL DEFAULT 'pieces',
    "target" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pièces',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "actorName" TEXT NOT NULL DEFAULT 'système',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LotCoques_code_key" ON "LotCoques"("code");

-- CreateIndex
CREATE INDEX "LotCoques_receivedAt_idx" ON "LotCoques"("receivedAt");

-- CreateIndex
CREATE INDEX "LotCoques_rizerieId_idx" ON "LotCoques"("rizerieId");

-- CreateIndex
CREATE INDEX "LotCoques_status_idx" ON "LotCoques"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BatchProduction_code_key" ON "BatchProduction"("code");

-- CreateIndex
CREATE INDEX "BatchProduction_startedAt_idx" ON "BatchProduction"("startedAt");

-- CreateIndex
CREATE INDEX "BatchProduction_lotId_idx" ON "BatchProduction"("lotId");

-- CreateIndex
CREATE INDEX "ProduitFini_batchId_idx" ON "ProduitFini"("batchId");

-- CreateIndex
CREATE INDEX "ProduitFini_status_idx" ON "ProduitFini"("status");

-- CreateIndex
CREATE INDEX "TestQualite_testedAt_idx" ON "TestQualite"("testedAt");

-- CreateIndex
CREATE INDEX "TestQualite_batchId_idx" ON "TestQualite"("batchId");

-- CreateIndex
CREATE INDEX "TestQualite_produitFiniId_idx" ON "TestQualite"("produitFiniId");

-- CreateIndex
CREATE INDEX "Stock_itemType_idx" ON "Stock"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_itemType_productType_key" ON "Stock"("itemType", "productType");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_stockId_idx" ON "StockMovement"("stockId");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_entityType_entityId_idx" ON "Document"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
