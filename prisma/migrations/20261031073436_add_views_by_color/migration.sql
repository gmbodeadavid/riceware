-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imagesByColor" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "currentPrice" TEXT NOT NULL,
    "oldPrice" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "galleryImages" JSONB NOT NULL DEFAULT '[]',
    "viewsByColor" JSONB NOT NULL DEFAULT '{}',
    "model3dUrl" TEXT
);
INSERT INTO "new_Product" ("accent", "category", "createdAt", "currentPrice", "format", "galleryImages", "headline", "id", "image", "imagesByColor", "isNew", "isPublished", "material", "model3dUrl", "name", "oldPrice", "slug", "sortOrder", "status", "summary", "viewsByColor") SELECT "accent", "category", "createdAt", "currentPrice", "format", "galleryImages", "headline", "id", "image", "imagesByColor", "isNew", "isPublished", "material", "model3dUrl", "name", "oldPrice", "slug", "sortOrder", "status", "summary", '{}' FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
