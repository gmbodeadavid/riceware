/**
 * scripts/p2-cleanup-verify.js
 *
 * 1. Crée une copie propre depuis riceware-2026-11-01-1319.db (pré-P2)
 * 2. Applique les migrations P2 sur la copie
 * 3. Lance migrate-traceability.ts sur la copie
 * 4. Vérifie : Rizerie=3, LotCoques=3, BatchProduction=3, Order=1, Stock=6,
 *    Stock.quantities identiques, StockMovement count, CA=6000, coverage=0/1
 *
 * N'ÉCRIT PAS sur la base réelle.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const WORKSPACE = path.resolve(__dirname, '..');
const BACKUP_1319 = path.join(WORKSPACE, 'backups', 'riceware-2026-11-01-1319.db');
const CLEAN_DB = path.join(WORKSPACE, 'prisma', 'clean-test.db');

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  PASS  ${msg}`); passed++; }
  else { console.error(`  FAIL  ${msg}`); failed++; }
}

async function main() {
  console.log('\n=== P2 CLEANUP — Vérification sur copie ===\n');

  // ─── Étape 1 : copier le backup 1319 (état pré-P2)
  console.log(`Copie de ${BACKUP_1319} → ${CLEAN_DB}`);
  if (!fs.existsSync(BACKUP_1319)) {
    console.error('ERREUR : backup riceware-2026-11-01-1319.db introuvable');
    process.exit(1);
  }
  fs.copyFileSync(BACKUP_1319, CLEAN_DB);
  console.log('Copie OK\n');

  // ─── Étape 2 : appliquer les migrations P2 sur la copie
  // Absolute path required for Prisma datasource override
  const cleanUrl = `file:${CLEAN_DB}`;
  console.log('Application des migrations P2 sur la copie...');
  execSync(`npx prisma migrate deploy`, {
    cwd: WORKSPACE,
    env: { ...process.env, DATABASE_URL: cleanUrl },
    stdio: 'pipe',
  });
  console.log('Migrations OK\n');

  // ─── Étape 3 : migrate-traceability.ts sur la copie
  console.log('Lancement de migrate-traceability.ts sur la copie...');
  execSync(`npx tsx scripts/migrate-traceability.ts`, {
    cwd: WORKSPACE,
    env: { ...process.env, DATABASE_URL: cleanUrl },
    stdio: 'inherit',
  });
  console.log('\n');

  // ─── Étape 4 : vérifications
  console.log('=== Vérifications sur la base nettoyée ===\n');
  const p = new PrismaClient({ datasources: { db: { url: cleanUrl } } });

  try {
    // Counts
    const [rizCount, lotCount, batchCount, orderCount, stockCount] = await Promise.all([
      p.rizerie.count({ where: { deletedAt: null } }),
      p.lotCoques.count({ where: { deletedAt: null } }),
      p.batchProduction.count({ where: { deletedAt: null } }),
      p.order.count({ where: { deletedAt: null } }),
      p.stock.count({ where: { deletedAt: null } }),
    ]);
    assert(rizCount === 3, `Rizerie = 3 (got ${rizCount})`);
    assert(lotCount === 3, `LotCoques = 3 (got ${lotCount})`);
    assert(batchCount === 3, `BatchProduction = 3 (got ${batchCount})`);
    assert(orderCount === 1, `Order = 1 (got ${orderCount})`);
    assert(stockCount === 6, `Stock = 6 (got ${stockCount})`);

    // Stock quantities — must match pre-P2 values from seed
    const expectedStocks = {
      'seed-stock-coques': 4700,
      'seed-stock-poudre': 680,
      'seed-stock-liant': 18,
      'seed-stock-assiette': 4560,
      'seed-stock-bol': 3290,
      'seed-stock-gobelet': 2405,
    };
    const stocks = await p.stock.findMany();
    for (const [id, expected] of Object.entries(expectedStocks)) {
      const s = stocks.find(s => s.id === id);
      assert(s?.quantity === expected, `${id} qty=${expected} (got ${s?.quantity})`);
    }

    // StockMovement count
    // Pre-P2 real state: 20 movements total (including cmvn8y* real movements)
    // After migrate-traceability: 1 movement gets lotCoquesId set (no new rows created)
    const mvtCount = await p.stockMovement.count();
    // The 1319 backup was taken before the P2 seed, so it has the real movements
    // Let's count what's there and show it
    console.log(`\n  StockMovement count = ${mvtCount}`);
    const mvtWithLotId = await p.stockMovement.count({ where: { lotCoquesId: { not: null } } });
    assert(mvtWithLotId === 1, `1 StockMovement avec lotCoquesId (got ${mvtWithLotId})`);

    // BatchMaterialUsage count: should be exactly 3 (one per real batch)
    const bmuCount = await p.batchMaterialUsage.count();
    assert(bmuCount === 3, `BatchMaterialUsage = 3 (got ${bmuCount})`);
    const bmuEstimated = await p.batchMaterialUsage.count({ where: { estimated: true } });
    assert(bmuEstimated === 3, `BatchMaterialUsage estimated = 3 (got ${bmuEstimated})`);
    const bmuNullKg = await p.batchMaterialUsage.count({ where: { kgUsed: null } });
    assert(bmuNullKg === 3, `BatchMaterialUsage kgUsed=null = 3 (got ${bmuNullKg})`);

    // No PackLot, no OrderLineAllocation, no seed-p2 customers/orders
    const packLotCount = await p.packLot.count();
    assert(packLotCount === 0, `PackLot = 0 (got ${packLotCount})`);
    const allocCount = await p.orderLineAllocation.count();
    assert(allocCount === 0, `OrderLineAllocation = 0 (got ${allocCount})`);
    const customerCount = await p.customer.count({ where: { deletedAt: null } });
    // Only the 1 real customer
    console.log(`  Customer count = ${customerCount}`);

    // CA = 6000 FCFA (seule commande réelle)
    const totalCA = await p.order.aggregate({
      where: { deletedAt: null, paymentStatus: 'paid' },
      _sum: { totalAmount: true },
    });
    assert(totalCA._sum.totalAmount === 6000, `CA encaissé = 6 000 FCFA (got ${totalCA._sum.totalAmount})`);

    // Coverage = 0/1 lignes allouées
    const deliveredLines = await p.orderLine.findMany({
      where: { order: { status: 'delivered', deletedAt: null } },
      include: { allocations: { where: { deletedAt: null }, select: { quantity: true } } },
    });
    const fullyCovered = deliveredLines.filter(l => l.allocations.reduce((s, a) => s + a.quantity, 0) >= l.quantity).length;
    console.log(`  Coverage lignes = ${fullyCovered}/${deliveredLines.length}`);
    assert(fullyCovered === 0, `0 lignes allouées (got ${fullyCovered})`);
    assert(deliveredLines.length === 1, `1 ligne livrée (got ${deliveredLines.length})`);

    // Verify seed P2 entities are ABSENT
    const p2Rizeries = await p.rizerie.count({ where: { id: { in: ['seed-p2-rizerie-daloa', 'seed-p2-rizerie-man'] } } });
    assert(p2Rizeries === 0, `Aucune rizerie P2 (got ${p2Rizeries})`);
    const p2Orders = await p.order.count({ where: { orderNumber: { in: ['RW-CMD-P2-001', 'RW-CMD-P2-002'] } } });
    assert(p2Orders === 0, `Aucune commande P2 (got ${p2Orders})`);

    console.log(`\n=== ${passed} PASS / ${failed} FAIL ===\n`);

    // Print stocks for visual verification
    console.log('Stocks finaux :');
    for (const s of stocks) {
      console.log(`  ${s.itemType}/${s.productType || '-'} qty=${s.quantity} ${s.unit}`);
    }

    console.log('\nStockMovements :');
    const mvts = await p.stockMovement.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, reference: true, lotCoquesId: true, quantity: true } });
    for (const m of mvts) {
      console.log(`  ${m.id} ref=${m.reference} qty=${m.quantity} lotCoquesId=${m.lotCoquesId ?? 'null'}`);
    }

  } finally {
    await p.$disconnect();
    fs.unlinkSync(CLEAN_DB);
    console.log('\nCopie de test supprimée.');
  }

  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
