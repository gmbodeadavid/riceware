-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "packKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" TEXT NOT NULL,
    "priceValue" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL,
    CONSTRAINT "ProductPack_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductPack" ("id", "label", "note", "packKey", "price", "productId", "quantity") SELECT "id", "label", "note", "packKey", "price", "productId", "quantity" FROM "ProductPack";
DROP TABLE "ProductPack";
ALTER TABLE "new_ProductPack" RENAME TO "ProductPack";
CREATE UNIQUE INDEX "ProductPack_productId_packKey_key" ON "ProductPack"("productId", "packKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
