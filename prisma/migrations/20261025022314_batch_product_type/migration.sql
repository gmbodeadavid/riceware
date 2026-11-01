-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BatchProduction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "lotId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'assiette',
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
INSERT INTO "new_BatchProduction" ("binderCostFcfa", "binderKg", "code", "createdAt", "cycleTimeMin", "energyCostFcfa", "id", "laborCostFcfa", "lotId", "mixHumidityPct", "observations", "operatorId", "piecesProduced", "powderCostFcfa", "powderKg", "pressingTempC", "pressureMpa", "rejectCause", "rejects", "startedAt", "updatedAt") SELECT "binderCostFcfa", "binderKg", "code", "createdAt", "cycleTimeMin", "energyCostFcfa", "id", "laborCostFcfa", "lotId", "mixHumidityPct", "observations", "operatorId", "piecesProduced", "powderCostFcfa", "powderKg", "pressingTempC", "pressureMpa", "rejectCause", "rejects", "startedAt", "updatedAt" FROM "BatchProduction";
DROP TABLE "BatchProduction";
ALTER TABLE "new_BatchProduction" RENAME TO "BatchProduction";
CREATE UNIQUE INDEX "BatchProduction_code_key" ON "BatchProduction"("code");
CREATE INDEX "BatchProduction_startedAt_idx" ON "BatchProduction"("startedAt");
CREATE INDEX "BatchProduction_lotId_idx" ON "BatchProduction"("lotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
