/**
 * scripts/p2-seed-inventory.js
 * Inventaire complet de toutes les lignes seed P2 présentes dans la base réelle.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const SEED_P2_IDS = {
  rizeries: ['seed-p2-rizerie-daloa', 'seed-p2-rizerie-man'],
  lots: ['seed-p2-lot-daloa', 'seed-p2-lot-man'],
  batches: ['seed-p2-batch-multi'],
  batchMaterialUsages: ['seed-p2-usage-daloa', 'seed-p2-usage-man'],
  packLots: ['seed-p2-packlot-assiette100', 'seed-p2-packlot-assiette150'],
  customers: ['seed-p2-customer-1', 'seed-p2-customer-2'],
  addresses: ['seed-p2-addr-1', 'seed-p2-addr-2'],
  orders: ['seed-p2-order-1', 'seed-p2-order-2'],
  orderLines: ['seed-p2-line-1', 'seed-p2-line-2'],
  allocations: ['seed-p2-alloc-1', 'seed-p2-alloc-2'],
};

// Also the 3 BMUs created by migrate-traceability.ts on existing batches
const MIGRATE_SCRIPT_BMUS = [
  { batchId: 'seed-batch-assiette', lotId: 'seed-lot-niofoin' },
  { batchId: 'seed-batch-bol', lotId: 'seed-lot-gagnoa' },
  { batchId: 'seed-batch-gobelet', lotId: 'seed-lot-bouake' },
];

async function main() {
  console.log('\n=== INVENTAIRE POLLUTION SEED P2 ===\n');

  // 1. Rizeries
  const rizeries = await p.rizerie.findMany({ where: { id: { in: SEED_P2_IDS.rizeries } } });
  console.log(`RIZERIES seed P2 (${rizeries.length}) :`, rizeries.map(r => `${r.id} — ${r.name}`));

  // 2. Lots
  const lots = await p.lotCoques.findMany({ where: { id: { in: SEED_P2_IDS.lots } } });
  console.log(`\nLOTS seed P2 (${lots.length}) :`, lots.map(l => `${l.id} — ${l.code}`));

  // 3. Batches
  const batches = await p.batchProduction.findMany({ where: { id: { in: SEED_P2_IDS.batches } } });
  console.log(`\nBATCHES seed P2 (${batches.length}) :`, batches.map(b => `${b.id} — ${b.code}`));

  // 4. BatchMaterialUsages (seed P2)
  const bmuP2 = await p.batchMaterialUsage.findMany({ where: { id: { in: SEED_P2_IDS.batchMaterialUsages } } });
  console.log(`\nBATCH_MATERIAL_USAGES seed P2 (${bmuP2.length}) :`, bmuP2.map(u => `${u.id} batch=${u.batchId} lot=${u.lotCoquesId} kg=${u.kgUsed}`));

  // 5. BatchMaterialUsages from migrate-traceability.ts (on real batches)
  console.log(`\nBATCH_MATERIAL_USAGES from migrate-traceability.ts :`);
  for (const ref of MIGRATE_SCRIPT_BMUS) {
    const bmu = await p.batchMaterialUsage.findUnique({
      where: { batchId_lotCoquesId: { batchId: ref.batchId, lotCoquesId: ref.lotId } },
    });
    console.log(`  batch=${ref.batchId} lot=${ref.lotId} → ${bmu ? `id=${bmu.id} kgUsed=${bmu.kgUsed} estimated=${bmu.estimated}` : 'NOT FOUND'}`);
  }

  // 6. PackLots
  const packLots = await p.packLot.findMany({ where: { id: { in: SEED_P2_IDS.packLots } } });
  console.log(`\nPACK_LOTS seed P2 (${packLots.length}) :`, packLots.map(pl => `${pl.id} code=${pl.code} qty=${pl.quantity} status=${pl.status}`));

  // 7. Customers
  const customers = await p.customer.findMany({ where: { id: { in: SEED_P2_IDS.customers } } });
  console.log(`\nCUSTOMERS seed P2 (${customers.length}) :`, customers.map(c => `${c.id} — ${c.fullName}`));

  // 8. Orders
  const orders = await p.order.findMany({ where: { id: { in: SEED_P2_IDS.orders } }, include: { lines: true } });
  console.log(`\nORDERS seed P2 (${orders.length}) :`);
  for (const o of orders) {
    console.log(`  ${o.id} ${o.orderNumber} total=${o.totalAmount} status=${o.status} paymentStatus=${o.paymentStatus}`);
    for (const l of o.lines) {
      console.log(`    line ${l.id} qty=${l.quantity} pack=${l.packNameSnapshot}`);
    }
  }

  // 9. Allocations
  const allocations = await p.orderLineAllocation.findMany({ where: { id: { in: SEED_P2_IDS.allocations } } });
  console.log(`\nALLOCATIONS seed P2 (${allocations.length}) :`, allocations.map(a => `${a.id} line=${a.orderLineId} packLot=${a.packLotId} qty=${a.quantity}`));

  // 10. StockMovements linked to seed P2 data (lotCoquesId set by migrate script)
  const mvtLinked = await p.stockMovement.findMany({ where: { lotCoquesId: { not: null } }, select: { id: true, reference: true, lotCoquesId: true } });
  console.log(`\nSTOCK_MOVEMENTS with lotCoquesId (${mvtLinked.length}) :`, mvtLinked.map(m => `${m.id} ref=${m.reference} lotCoquesId=${m.lotCoquesId}`));

  // 11. Any StockMovements created by seed P2 batch (look for reference containing P2 batch code)
  const mvtP2Batch = await p.stockMovement.findMany({ where: { reference: 'RW-BAT-2026-10-30-001' } });
  console.log(`\nSTOCK_MOVEMENTS for P2 batch (${mvtP2Batch.length}) :`, mvtP2Batch.map(m => `${m.id}`));

  // 12. AuditLogs for seed P2 entities
  const auditLogs = await p.auditLog.findMany({
    where: { entityId: { in: [...SEED_P2_IDS.batches, ...SEED_P2_IDS.lots, ...SEED_P2_IDS.rizeries, ...SEED_P2_IDS.orders] } },
    select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
  });
  console.log(`\nAUDIT_LOGS for P2 entities (${auditLogs.length}) :`, auditLogs.map(a => `${a.action}/${a.entityType}/${a.entityId}`));

  // 13. Notifications
  const notifs = await p.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, type: true, title: true, createdAt: true } });
  console.log(`\nNOTIFICATIONS (last 10) :`, notifs.map(n => `${n.id} ${n.title}`));

  // 14. ProduitFini / TestQualite linked to P2 batch
  const produits = await p.produitFini.findMany({ where: { batchId: 'seed-p2-batch-multi' } });
  console.log(`\nPRODUITS_FINIS for P2 batch (${produits.length})`);
  const tests = await p.testQualite.findMany({ where: { batchId: 'seed-p2-batch-multi' } });
  console.log(`TESTS_QUALITE for P2 batch (${tests.length})`);

  // 15. Current Stock quantities
  const stocks = await p.stock.findMany({ orderBy: [{ itemType: 'asc' }, { productType: 'asc' }] });
  console.log(`\nSTOCK quantities (current) :`);
  for (const s of stocks) {
    console.log(`  ${s.id} ${s.itemType}/${s.productType} qty=${s.quantity} unit=${s.unit}`);
  }

  // 16. Total StockMovement count
  const mvtCount = await p.stockMovement.count();
  const mvtAll = await p.stockMovement.findMany({ select: { id: true, reference: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
  console.log(`\nSTOCK_MOVEMENTS total: ${mvtCount}`);
  mvtAll.forEach(m => console.log(`  ${m.id} ref=${m.reference} createdAt=${m.createdAt.toISOString()}`));

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
