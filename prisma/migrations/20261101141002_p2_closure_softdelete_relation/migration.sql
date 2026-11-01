-- AlterTable
ALTER TABLE "BatchMaterialUsage" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "BatchMaterialUsage" ADD COLUMN "deletedById" TEXT;

-- AlterTable
ALTER TABLE "OrderLineAllocation" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "OrderLineAllocation" ADD COLUMN "deletedById" TEXT;

-- AlterTable
ALTER TABLE "PackLot" ADD COLUMN "deletedById" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productPackId" TEXT,
    "packNameSnapshot" TEXT NOT NULL,
    "packContentSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceAmount" INTEGER NOT NULL,
    "lineTotalAmount" INTEGER NOT NULL,
    "packQuantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderLine_productPackId_fkey" FOREIGN KEY ("productPackId") REFERENCES "ProductPack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderLine" ("id", "lineTotalAmount", "orderId", "packContentSnapshot", "packNameSnapshot", "packQuantity", "productId", "productPackId", "quantity", "unitPriceAmount") SELECT "id", "lineTotalAmount", "orderId", "packContentSnapshot", "packNameSnapshot", "packQuantity", "productId", "productPackId", "quantity", "unitPriceAmount" FROM "OrderLine";
DROP TABLE "OrderLine";
ALTER TABLE "new_OrderLine" RENAME TO "OrderLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
