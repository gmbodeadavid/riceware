import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Trouver tous les packs dont l'id ne correspond pas au pattern attendu
  // Pattern attendu : {productId}-pack-{packKey}
  // Packs parasites : {productId}-{packKey} (sans "-pack-")
  const allPacks = await db.productPack.findMany({
    include: { packLots: { where: { deletedAt: null }, take: 1 } },
  });

  const parasites = allPacks.filter((p) => {
    const expected = `${p.productId}-pack-${p.packKey}`;
    return p.id !== expected && p.packLots.length === 0;
  });

  console.log(`Packs parasites sans PackLot actif : ${parasites.length}`);
  for (const p of parasites) {
    console.log(`  Suppression : id="${p.id}"  productId="${p.productId}"  packKey="${p.packKey}"  label="${p.label}"`);
  }

  if (parasites.length === 0) {
    console.log('Rien à supprimer.');
    return;
  }

  const ids = parasites.map((p) => p.id);
  const result = await db.productPack.deleteMany({ where: { id: { in: ids } } });
  console.log(`\n✅ ${result.count} pack(s) parasites supprimés.`);

  // Vérification finale
  const remaining = await db.productPack.findMany({
    where: { productId: { in: [...new Set(parasites.map((p) => p.productId))] } },
    orderBy: [{ productId: 'asc' }, { packKey: 'asc' }],
  });
  console.log(`\nPacks restants pour les produits concernés :`);
  for (const p of remaining) {
    console.log(`  id="${p.id}"  packKey="${p.packKey}"  label="${p.label}"`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
