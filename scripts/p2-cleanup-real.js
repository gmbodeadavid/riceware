/**
 * scripts/p2-cleanup-real.js
 *
 * SUPPRIME les données du seed P2 de la base réelle (dev.db).
 * À n'exécuter QU'APRÈS accord explicite.
 *
 * Effectue aussi les modifications issues de migrate-traceability.ts
 * sur les mouvements de la base réelle (lotCoquesId déjà setté, idempotent).
 *
 * Ce script :
 *  - Supprime (DELETE, pas soft-delete) les lignes seed P2 dans l'ordre FK correct
 *  - Conserve toutes les données réelles (commandes, mouvements, lots, batches)
 *  - Les 3 BatchMaterialUsage créés par migrate-traceability.ts sur les vrais batches sont CONSERVÉS
 *  - Le StockMovement seed-mvt-coques-in avec lotCoquesId est CONSERVÉ
 *
 * Vérifie avant et après les counts attendus.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const SEED_P2 = {
  allocations: ['seed-p2-alloc-1', 'seed-p2-alloc-2'],
  orderLines: ['seed-p2-line-1', 'seed-p2-line-2'],
  orders: ['seed-p2-order-1', 'seed-p2-order-2'],
  addresses: ['seed-p2-addr-1', 'seed-p2-addr-2'],
  customers: ['seed-p2-customer-1', 'seed-p2-customer-2'],
  packLots: ['seed-p2-packlot-assiette100', 'seed-p2-packlot-assiette150'],
  batchMaterialUsages: ['seed-p2-usage-daloa', 'seed-p2-usage-man'],
  batches: ['seed-p2-batch-multi'],
  lots: ['seed-p2-lot-daloa', 'seed-p2-lot-man'],
  rizeries: ['seed-p2-rizerie-daloa', 'seed-p2-rizerie-man'],
};

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n=== P2 NETTOYAGE BASE RÉELLE${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  // ─── Vérification pré-nettoyage
  const [riz, lot, batch, order, stock, packLot, alloc, bmu, customer] = await Promise.all([
    p.rizerie.count({ where: { deletedAt: null } }),
    p.lotCoques.count({ where: { deletedAt: null } }),
    p.batchProduction.count({ where: { deletedAt: null } }),
    p.order.count({ where: { deletedAt: null } }),
    p.stock.count({ where: { deletedAt: null } }),
    p.packLot.count(),
    p.orderLineAllocation.count(),
    p.batchMaterialUsage.count(),
    p.customer.count({ where: { deletedAt: null } }),
  ]);
  console.log('État AVANT nettoyage :');
  console.log(`  Rizerie=${riz} Lot=${lot} Batch=${batch} Order=${order} Stock=${stock}`);
  console.log(`  PackLot=${packLot} Allocation=${alloc} BMU=${bmu} Customer=${customer}\n`);

  if (!DRY_RUN) {
    // ─── Suppression dans l'ordre FK (les enfants d'abord)
    console.log('Suppression OrderLineAllocation seed-p2...');
    await p.orderLineAllocation.deleteMany({ where: { id: { in: SEED_P2.allocations } } });

    console.log('Suppression OrderLine seed-p2...');
    await p.orderLine.deleteMany({ where: { id: { in: SEED_P2.orderLines } } });

    console.log('Suppression Order seed-p2...');
    await p.order.deleteMany({ where: { id: { in: SEED_P2.orders } } });

    console.log('Suppression Address seed-p2...');
    await p.address.deleteMany({ where: { id: { in: SEED_P2.addresses } } });

    console.log('Suppression Customer seed-p2...');
    await p.customer.deleteMany({ where: { id: { in: SEED_P2.customers } } });

    console.log('Suppression PackLot seed-p2...');
    await p.packLot.deleteMany({ where: { id: { in: SEED_P2.packLots } } });

    console.log('Suppression BatchMaterialUsage seed-p2 (uniquement les seed P2, pas les BMUs de migration)...');
    await p.batchMaterialUsage.deleteMany({ where: { id: { in: SEED_P2.batchMaterialUsages } } });

    console.log('Suppression BatchProduction seed-p2...');
    await p.batchProduction.deleteMany({ where: { id: { in: SEED_P2.batches } } });

    console.log('Suppression LotCoques seed-p2...');
    await p.lotCoques.deleteMany({ where: { id: { in: SEED_P2.lots } } });

    console.log('Suppression Rizerie seed-p2...');
    await p.rizerie.deleteMany({ where: { id: { in: SEED_P2.rizeries } } });

    console.log('\nNettoyage terminé.\n');
  }

  // ─── Vérification post-nettoyage
  const [riz2, lot2, batch2, order2, stock2, packLot2, alloc2, bmu2, customer2] = await Promise.all([
    p.rizerie.count({ where: { deletedAt: null } }),
    p.lotCoques.count({ where: { deletedAt: null } }),
    p.batchProduction.count({ where: { deletedAt: null } }),
    p.order.count({ where: { deletedAt: null } }),
    p.stock.count({ where: { deletedAt: null } }),
    p.packLot.count(),
    p.orderLineAllocation.count(),
    p.batchMaterialUsage.count(),
    p.customer.count({ where: { deletedAt: null } }),
  ]);

  console.log(`État APRÈS nettoyage${DRY_RUN ? ' (simulé)' : ''} :`);
  console.log(`  Rizerie=${riz2} Lot=${lot2} Batch=${batch2} Order=${order2} Stock=${stock2}`);
  console.log(`  PackLot=${packLot2} Allocation=${alloc2} BMU=${bmu2} Customer=${customer2}\n`);

  // Assertions attendues
  const ok = (cond, msg) => { if (cond) console.log(`  PASS  ${msg}`); else console.error(`  FAIL  ${msg}`); return cond; };
  let pass = true;
  if (!DRY_RUN) {
    pass &= ok(riz2 === 3, `Rizerie = 3 (got ${riz2})`);
    pass &= ok(lot2 === 3, `LotCoques = 3 (got ${lot2})`);
    pass &= ok(batch2 === 3, `BatchProduction = 3 (got ${batch2})`);
    pass &= ok(order2 === 1, `Order = 1 (got ${order2})`);
    pass &= ok(stock2 === 6, `Stock = 6 (got ${stock2})`);
    pass &= ok(packLot2 === 0, `PackLot = 0 (got ${packLot2})`);
    pass &= ok(alloc2 === 0, `Allocation = 0 (got ${alloc2})`);
    pass &= ok(bmu2 === 3, `BMU = 3 (BMUs de migration conservés) (got ${bmu2})`);
    const totalCA = await p.order.aggregate({ where: { deletedAt: null, paymentStatus: 'paid' }, _sum: { totalAmount: true } });
    pass &= ok(totalCA._sum.totalAmount === 6000, `CA = 6 000 FCFA (got ${totalCA._sum.totalAmount})`);
  } else {
    console.log(`  INFO  Dry-run : après nettoyage on attendrait Rizerie=3 Lot=3 Batch=3 Order=1 PackLot=0 Alloc=0 BMU=3 CA=6000`);
    pass = true;
  }

  if (!pass) { console.error('\n⚠ Certaines vérifications ont échoué.'); process.exit(1); }
  else console.log('\n✅ Toutes les vérifications passent.\n');

  if (DRY_RUN) {
    console.log('Mode dry-run : aucune donnée modifiée.\nPour appliquer : node scripts/p2-cleanup-real.js');
  }
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
