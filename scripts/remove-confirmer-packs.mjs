/**
 * scripts/remove-confirmer-packs.mjs
 *
 * Supprime de la base réelle les ProductPacks "À confirmer" (packKey 10/20/30)
 * qui ont été réintroduits par seed-boutique.ts sur la base réelle.
 *
 * PRÉALABLE : vérifier qu'aucune OrderLine ne référence ces packs.
 * Ce script échoue proprement si une FK est présente.
 *
 * Usage : node scripts/remove-confirmer-packs.mjs
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const url = process.env.DATABASE_URL || '(non défini)';
console.log('DATABASE_URL :', url);
console.log('');

const PACK_KEYS_TO_REMOVE = ['10', '20', '30'];

async function main() {
  // 1. Lister les packs ciblés
  const targets = await db.productPack.findMany({
    where: { packKey: { in: PACK_KEYS_TO_REMOVE } },
    select: { id: true, productId: true, packKey: true, label: true, price: true },
  });

  console.log(`Packs "À confirmer" trouvés : ${targets.length}`);
  targets.forEach((p) => console.log(`  - ${p.id} | ${p.label} | ${p.price}`));

  if (targets.length === 0) {
    console.log('Rien à supprimer.');
    return;
  }

  // 2. Vérifier qu'aucune OrderLine ne les référence
  const packIds = targets.map((p) => p.id);
  const blocking = await db.orderLine.count({
    where: { productPackId: { in: packIds } },
  });

  if (blocking > 0) {
    console.error(`\n❌ REFUSÉ : ${blocking} ligne(s) de commande référence(nt) ces packs.`);
    console.error('   Rattachez-les à d\'autres packs avant de supprimer.');
    process.exit(1);
  }

  // 3. Vérifier qu'aucun PackLot de production ne les référence
  const blockingPackLots = await db.packLot.count({
    where: { packId: { in: packIds } },
  });

  if (blockingPackLots > 0) {
    console.error(`\n❌ REFUSÉ : ${blockingPackLots} PackLot(s) de production référence(nt) ces packs.`);
    console.error('   Supprimez ou rattachez les PackLots d\'abord.');
    process.exit(1);
  }

  // 4. Suppression
  const result = await db.productPack.deleteMany({
    where: { id: { in: packIds } },
  });

  console.log(`\n✅ ${result.count} pack(s) "À confirmer" supprimés de la base réelle.`);
}

main()
  .catch((e) => { console.error('ERREUR :', e); process.exit(1); })
  .finally(() => db.$disconnect());
