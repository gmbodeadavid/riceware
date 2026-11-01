-- P1 : Suppression douce (soft delete)
-- Ajout de deletedAt / deletedById sur 9 modèles.
-- Migration additive : aucune donnée existante n'est modifiée.

ALTER TABLE "Rizerie"          ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "Rizerie"          ADD COLUMN "deletedById" TEXT;

ALTER TABLE "LotCoques"        ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "LotCoques"        ADD COLUMN "deletedById" TEXT;

ALTER TABLE "BatchProduction"  ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "BatchProduction"  ADD COLUMN "deletedById" TEXT;

ALTER TABLE "ProduitFini"      ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "ProduitFini"      ADD COLUMN "deletedById" TEXT;

ALTER TABLE "Stock"            ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "Stock"            ADD COLUMN "deletedById" TEXT;

ALTER TABLE "Partner"          ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "Partner"          ADD COLUMN "deletedById" TEXT;

ALTER TABLE "Document"         ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "Document"         ADD COLUMN "deletedById" TEXT;

ALTER TABLE "Customer"         ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "Customer"         ADD COLUMN "deletedById" TEXT;

ALTER TABLE "Order"            ADD COLUMN "deletedAt"   DATETIME;
ALTER TABLE "Order"            ADD COLUMN "deletedById" TEXT;
