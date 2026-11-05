import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const packs = await db.productPack.findMany({
    where: { productId: 'assiette-plate' },
    include: { packLots: { where: { deletedAt: null }, select: { id: true, code: true } } },
    orderBy: { packKey: 'asc' },
  });

  console.log(`\nProductPacks pour assiette-plate (${packs.length} total) :\n`);
  for (const p of packs) {
    console.log(`  id="${p.id}"  packKey="${p.packKey}"  label="${p.label}"  packLots=${p.packLots.length}`);
  }

  // Chercher les doublons par packKey
  const byKey = new Map<string, typeof packs>();
  for (const p of packs) {
    const arr = byKey.get(p.packKey) ?? [];
    arr.push(p);
    byKey.set(p.packKey, arr);
  }
  console.log('\nDoublons (packKey avec > 1 entrée) :');
  let found = false;
  for (const [key, entries] of byKey) {
    if (entries.length > 1) {
      found = true;
      console.log(`  packKey="${key}" → ${entries.length} entrées :`);
      for (const e of entries) {
        console.log(`    id="${e.id}"  packLots=${e.packLots.length}`);
      }
    }
  }
  if (!found) console.log('  Aucun doublon détecté.');

  // Aussi vérifier tous les produits
  const allDupes = await db.$queryRaw<{ productId: string; packKey: string; count: bigint }[]>`
    SELECT "productId", "packKey", COUNT(*) as count
    FROM "ProductPack"
    GROUP BY "productId", "packKey"
    HAVING COUNT(*) > 1
  `;
  console.log(`\nDoublons globaux toutes produits : ${allDupes.length}`);
  for (const d of allDupes) {
    console.log(`  productId="${d.productId}" packKey="${d.packKey}" count=${d.count}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
