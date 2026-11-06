/**
 * scripts/purge-demo-data.mts
 *
 * Supprime toutes les données de démonstration du seed de la base Neon.
 *
 * CONSERVE :
 *   - 5 comptes User (admin, production, logistique, commercial, lecture)
 *   - Settings système
 *   - Product + ProductPack + ProductCategory (catalogue e-commerce)
 *   - BlogAuthor + BlogSettings
 *   - La vraie commande client + son Customer + son Address + ses OrderLines
 *   - Les PackLot et OrderLineAllocation liés à la vraie commande
 *
 * SUPPRIME (dans l'ordre des FKs) :
 *   AuditLog, Notification, Goal
 *   → OrderLineAllocation (demo P2 seulement)
 *   → PackLot (demo P2 non liés à la vraie commande)
 *   → OrderLine (demo P2)
 *   → Order (demo P2)
 *   → Address (demo P2)
 *   → Customer (demo P2)
 *   → BatchMaterialUsage (tous)
 *   → ProduitFini (tous)
 *   → TestQualite (tous)
 *   → StockMovement (tous)
 *   → Stock (tous)
 *   → BatchProduction (tous)
 *   → LotCoques (tous)
 *   → Rizerie (tous)
 *   → Partner (tous)
 *
 * Usage :
 *   npx tsx scripts/purge-demo-data.mts --confirm
 */

import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';
console.log('\nDATABASE_URL :', url.replace(/:([^:@]+)@/, ':***@'));

// Guard : refus sur SQLite local
if (url.includes('file:') || url.includes('dev.db')) {
  console.error('\n❌ REFUSÉ : DATABASE_URL pointe vers SQLite. Ce script ne tourne que sur Neon/PostgreSQL.\n');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');
if (!confirm) {
  console.log('\n⚠️  Mode lecture seule (dry-run) — aucune suppression effectuée.');
  console.log('   Relancez avec --confirm pour appliquer.\n');
}

const db = new PrismaClient();

async function count(label: string, n: number) {
  console.log(`  ${label.padEnd(30)} ${n}`);
}

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  COMPTAGES AVANT PURGE');
  console.log('═══════════════════════════════════════════');
  await count('AuditLog', await db.auditLog.count());
  await count('Notification', await db.notification.count());
  await count('Goal', await db.goal.count());
  await count('OrderLineAllocation', await db.orderLineAllocation.count());
  await count('PackLot', await db.packLot.count());
  await count('OrderLine', await db.orderLine.count());
  await count('Order', await db.order.count());
  await count('Customer', await db.customer.count());
  await count('Address', await db.address.count());
  await count('BatchMaterialUsage', await db.batchMaterialUsage.count());
  await count('ProduitFini', await db.produitFini.count());
  await count('TestQualite', await db.testQualite.count());
  await count('StockMovement', await db.stockMovement.count());
  await count('Stock', await db.stock.count());
  await count('BatchProduction', await db.batchProduction.count());
  await count('LotCoques', await db.lotCoques.count());
  await count('Rizerie', await db.rizerie.count());
  await count('Partner', await db.partner.count());
  await count('--- À GARDER ---', 0);
  await count('User', await db.user.count());
  await count('Setting', await db.setting.count());
  await count('Product', await db.product.count());
  await count('ProductPack', await db.productPack.count());

  if (!confirm) {
    console.log('\nDry-run terminé. Relancez avec --confirm pour purger.\n');
    return;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  PURGE EN COURS...');
  console.log('═══════════════════════════════════════════');

  // ── Identifier la vraie commande (pas demo P2) ──────────────────────────────
  const DEMO_ORDER_NUMBERS = ['RW-CMD-P2-001', 'RW-CMD-P2-002'];
  const realOrders = await db.order.findMany({
    where: { orderNumber: { notIn: DEMO_ORDER_NUMBERS } },
    select: { id: true },
  });
  const realOrderIds = realOrders.map((o) => o.id);
  console.log(`  Vraies commandes à conserver : ${realOrderIds.length}`);

  // PackLots liés aux vraies commandes (via OrderLineAllocation)
  const realAllocations = await db.orderLineAllocation.findMany({
    where: {
      orderLine: { orderId: { in: realOrderIds } },
    },
    select: { packLotId: true },
  });
  const protectedPackLotIds = [...new Set(realAllocations.map((a) => a.packLotId))];
  console.log(`  PackLots protégés (liés aux vraies commandes) : ${protectedPackLotIds.length}`);

  // ── 1. AuditLog ─────────────────────────────────────────────────────────────
  const r1 = await db.auditLog.deleteMany({});
  console.log(`  AuditLog supprimés : ${r1.count}`);

  // ── 2. Notification ──────────────────────────────────────────────────────────
  const r2 = await db.notification.deleteMany({});
  console.log(`  Notification supprimées : ${r2.count}`);

  // ── 3. Goal ──────────────────────────────────────────────────────────────────
  const r3 = await db.goal.deleteMany({});
  console.log(`  Goal supprimés : ${r3.count}`);

  // ── 4. OrderLineAllocation demo P2 ───────────────────────────────────────────
  // Supprimer toutes les allocations SAUF celles liées aux vraies commandes
  const r4 = await db.orderLineAllocation.deleteMany({
    where: {
      orderLine: { orderId: { notIn: realOrderIds } },
    },
  });
  console.log(`  OrderLineAllocation demo supprimées : ${r4.count}`);

  // ── 5. PackLot demo (non protégés) ───────────────────────────────────────────
  const r5 = await db.packLot.deleteMany({
    where: {
      id: protectedPackLotIds.length > 0
        ? { notIn: protectedPackLotIds }
        : undefined,
    },
  });
  console.log(`  PackLot demo supprimés : ${r5.count}`);

  // ── 6. OrderLine demo P2 ─────────────────────────────────────────────────────
  const r6 = await db.orderLine.deleteMany({
    where: { orderId: { notIn: realOrderIds } },
  });
  console.log(`  OrderLine demo supprimées : ${r6.count}`);

  // ── 7. Order demo P2 ─────────────────────────────────────────────────────────
  const r7 = await db.order.deleteMany({
    where: { orderNumber: { in: DEMO_ORDER_NUMBERS } },
  });
  console.log(`  Order demo supprimées : ${r7.count}`);

  // ── 8. Address demo P2 ───────────────────────────────────────────────────────
  // Supprimer uniquement les adresses des clients demo (pas des vrais clients)
  const demoCustomerIds = ['seed-p2-customer-1', 'seed-p2-customer-2'];
  const r8 = await db.address.deleteMany({
    where: { customerId: { in: demoCustomerIds } },
  });
  console.log(`  Address demo supprimées : ${r8.count}`);

  // ── 9. Customer demo P2 ──────────────────────────────────────────────────────
  const r9 = await db.customer.deleteMany({
    where: { id: { in: demoCustomerIds } },
  });
  console.log(`  Customer demo supprimés : ${r9.count}`);

  // ── 10. BatchMaterialUsage (tous) ────────────────────────────────────────────
  const r10 = await db.batchMaterialUsage.deleteMany({});
  console.log(`  BatchMaterialUsage supprimés : ${r10.count}`);

  // ── 11. ProduitFini (tous) ───────────────────────────────────────────────────
  const r11 = await db.produitFini.deleteMany({});
  console.log(`  ProduitFini supprimés : ${r11.count}`);

  // ── 12. TestQualite (tous) ───────────────────────────────────────────────────
  const r12 = await db.testQualite.deleteMany({});
  console.log(`  TestQualite supprimés : ${r12.count}`);

  // ── 13. StockMovement (tous) ─────────────────────────────────────────────────
  const r13 = await db.stockMovement.deleteMany({});
  console.log(`  StockMovement supprimés : ${r13.count}`);

  // ── 14. Stock (tous) ─────────────────────────────────────────────────────────
  const r14 = await db.stock.deleteMany({});
  console.log(`  Stock supprimés : ${r14.count}`);

  // ── 15. BatchProduction (tous) ───────────────────────────────────────────────
  const r15 = await db.batchProduction.deleteMany({});
  console.log(`  BatchProduction supprimés : ${r15.count}`);

  // ── 16. LotCoques (tous) ─────────────────────────────────────────────────────
  const r16 = await db.lotCoques.deleteMany({});
  console.log(`  LotCoques supprimés : ${r16.count}`);

  // ── 17. Rizerie (tous) ───────────────────────────────────────────────────────
  const r17 = await db.rizerie.deleteMany({});
  console.log(`  Rizerie supprimées : ${r17.count}`);

  // ── 18. Partner (tous) ───────────────────────────────────────────────────────
  const r18 = await db.partner.deleteMany({});
  console.log(`  Partner supprimés : ${r18.count}`);

  // ── Vérification finale ──────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  COMPTAGES APRÈS PURGE');
  console.log('═══════════════════════════════════════════');
  await count('AuditLog', await db.auditLog.count());
  await count('Notification', await db.notification.count());
  await count('Goal', await db.goal.count());
  await count('OrderLineAllocation', await db.orderLineAllocation.count());
  await count('PackLot', await db.packLot.count());
  await count('OrderLine', await db.orderLine.count());
  await count('Order', await db.order.count());
  await count('Customer', await db.customer.count());
  await count('BatchMaterialUsage', await db.batchMaterialUsage.count());
  await count('ProduitFini', await db.produitFini.count());
  await count('TestQualite', await db.testQualite.count());
  await count('StockMovement', await db.stockMovement.count());
  await count('Stock', await db.stock.count());
  await count('BatchProduction', await db.batchProduction.count());
  await count('LotCoques', await db.lotCoques.count());
  await count('Rizerie', await db.rizerie.count());
  await count('Partner', await db.partner.count());
  await count('--- Conservés ---', 0);
  await count('User', await db.user.count());
  await count('Setting', await db.setting.count());
  await count('Product', await db.product.count());
  await count('ProductPack', await db.productPack.count());

  console.log('\n✅ Purge terminée.\n');
}

main().catch((e) => { console.error('ERREUR :', e); process.exit(1); }).finally(() => db.$disconnect());
