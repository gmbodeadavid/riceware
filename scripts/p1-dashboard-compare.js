/**
 * scripts/p1-dashboard-compare.js
 *
 * Compare getDashboardData() avant P1 (logique reconstruite) vs après P1
 * sur une COPIE de la base. Vérifie champ par champ qu'aucun KPI ne change.
 *
 * Usage : node scripts/p1-dashboard-compare.js
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const REAL_DB = path.join(ROOT, 'prisma', 'dev.db');
const TEST_DB = path.join(ROOT, 'backups', 'p1-dashboard-compare.db');

fs.copyFileSync(REAL_DB, TEST_DB);
console.log('[SETUP] Copie :', TEST_DB);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${TEST_DB}` } } });

function computeBatchCost(b) {
  return b.powderCostFcfa + b.binderCostFcfa + b.laborCostFcfa + b.energyCostFcfa;
}
function computeYield(pieces, rejects) {
  if (pieces <= 0) return 0;
  return (Math.max(0, pieces - rejects) / pieces) * 100;
}
function computeRejectRate(pieces, rejects) {
  if (pieces <= 0) return 0;
  return (rejects / pieces) * 100;
}
function startOfDay(d) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function startOfWeek(d) { const r = new Date(d); r.setHours(0,0,0,0); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

async function dashboardBefore() {
  // EXACT logic from commit 4e4b864 — no deletedAt filters anywhere
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const eightWeeksAgo = addDays(startOfWeek(now), -7 * 7);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [batches, lots, stocks, orderRows, testCounts, partnerCount, rizerieCount] = await Promise.all([
    prisma.batchProduction.findMany({
      where: { startedAt: { gte: sixMonthsAgo } },
      orderBy: { startedAt: 'desc' },
      include: { lot: { select: { code: true } } },
    }),
    prisma.lotCoques.findMany({
      where: { receivedAt: { gte: sixMonthsAgo } },
      orderBy: { receivedAt: 'desc' },
    }),
    prisma.stock.findMany({ orderBy: [{ itemType: 'asc' }, { label: 'asc' }] }),
    // OLD: no where clause at all
    prisma.order.findMany({ select: { status: true, paymentStatus: true, totalAmount: true, createdAt: true } }),
    prisma.testQualite.groupBy({ by: ['result'], _count: { _all: true } }),
    prisma.partner.count({ where: { active: true } }),
    prisma.rizerie.count({ where: { active: true } }),
  ]);

  const sum = (rows) => rows.reduce((acc, b) => {
    acc.pieces += b.piecesProduced; acc.rejects += b.rejects;
    acc.cost += computeBatchCost(b); acc.valid += Math.max(0, b.piecesProduced - b.rejects);
    return acc;
  }, { pieces: 0, rejects: 0, cost: 0, valid: 0 });

  const todayTotals = sum(batches.filter(b => b.startedAt >= today));
  const weekTotals = sum(batches.filter(b => b.startedAt >= week));
  const monthTotals = sum(batches.filter(b => b.startedAt >= month));

  const paidOrders = orderRows.filter(o => o.paymentStatus === 'paid');
  const revenue = paidOrders.reduce((t, o) => t + o.totalAmount, 0);
  const testsPassed = testCounts.find(r => r.result === 'succes')?._count._all ?? 0;
  const testsFailed = testCounts.find(r => r.result === 'echec')?._count._all ?? 0;
  const totalTests = testsPassed + testsFailed;
  const lowStocks = stocks.filter(s => s.minThreshold > 0 && s.quantity <= s.minThreshold);

  return {
    todayPieces: todayTotals.pieces,
    weekPieces: weekTotals.pieces,
    monthPieces: monthTotals.pieces,
    monthRejects: monthTotals.rejects,
    rejectRate: computeRejectRate(monthTotals.pieces, monthTotals.rejects),
    yieldRate: computeYield(monthTotals.pieces, monthTotals.rejects),
    costPerUnit: monthTotals.valid ? monthTotals.cost / monthTotals.valid : 0,
    totalCostMonth: monthTotals.cost,
    lowStockCount: lowStocks.length,
    activeRizeries: rizerieCount,
    activePartners: partnerCount,
    revenue,
    paidOrders: paidOrders.length,
    totalOrders: orderRows.length,
    testsPassed,
    testsFailed,
    testPassRate: totalTests ? (testsPassed / totalTests) * 100 : 0,
    totalLots: lots.length,
    totalLotsWeight: lots.reduce((t, l) => t + l.netWeightKg, 0),
  };
}

async function dashboardAfter() {
  // EXACT logic from current HEAD — deletedAt:null added everywhere
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const eightWeeksAgo = addDays(startOfWeek(now), -7 * 7);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [batches, lots, stocks, orderRows, testCounts, partnerCount, rizerieCount] = await Promise.all([
    prisma.batchProduction.findMany({
      where: { deletedAt: null, startedAt: { gte: sixMonthsAgo } },
      orderBy: { startedAt: 'desc' },
      include: { lot: { select: { code: true } } },
    }),
    prisma.lotCoques.findMany({
      where: { deletedAt: null, receivedAt: { gte: sixMonthsAgo } },
      orderBy: { receivedAt: 'desc' },
    }),
    prisma.stock.findMany({ where: { deletedAt: null }, orderBy: [{ itemType: 'asc' }, { label: 'asc' }] }),
    prisma.order.findMany({
      where: { deletedAt: null },
      select: { status: true, paymentStatus: true, totalAmount: true, createdAt: true },
    }),
    prisma.testQualite.groupBy({ by: ['result'], _count: { _all: true } }),
    prisma.partner.count({ where: { active: true, deletedAt: null } }),
    prisma.rizerie.count({ where: { active: true, deletedAt: null } }),
  ]);

  const sum = (rows) => rows.reduce((acc, b) => {
    acc.pieces += b.piecesProduced; acc.rejects += b.rejects;
    acc.cost += computeBatchCost(b); acc.valid += Math.max(0, b.piecesProduced - b.rejects);
    return acc;
  }, { pieces: 0, rejects: 0, cost: 0, valid: 0 });

  const todayTotals = sum(batches.filter(b => b.startedAt >= today));
  const weekTotals = sum(batches.filter(b => b.startedAt >= week));
  const monthTotals = sum(batches.filter(b => b.startedAt >= month));

  const paidOrders = orderRows.filter(o => o.paymentStatus === 'paid');
  const revenue = paidOrders.reduce((t, o) => t + o.totalAmount, 0);
  const testsPassed = testCounts.find(r => r.result === 'succes')?._count._all ?? 0;
  const testsFailed = testCounts.find(r => r.result === 'echec')?._count._all ?? 0;
  const totalTests = testsPassed + testsFailed;
  const lowStocks = stocks.filter(s => s.minThreshold > 0 && s.quantity <= s.minThreshold);

  return {
    todayPieces: todayTotals.pieces,
    weekPieces: weekTotals.pieces,
    monthPieces: monthTotals.pieces,
    monthRejects: monthTotals.rejects,
    rejectRate: computeRejectRate(monthTotals.pieces, monthTotals.rejects),
    yieldRate: computeYield(monthTotals.pieces, monthTotals.rejects),
    costPerUnit: monthTotals.valid ? monthTotals.cost / monthTotals.valid : 0,
    totalCostMonth: monthTotals.cost,
    lowStockCount: lowStocks.length,
    activeRizeries: rizerieCount,
    activePartners: partnerCount,
    revenue,
    paidOrders: paidOrders.length,
    totalOrders: orderRows.length,
    testsPassed,
    testsFailed,
    testPassRate: totalTests ? (testsPassed / totalTests) * 100 : 0,
    totalLots: lots.length,
    totalLotsWeight: lots.reduce((t, l) => t + l.netWeightKg, 0),
  };
}

async function main() {
  try {
    const [before, after] = await Promise.all([dashboardBefore(), dashboardAfter()]);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('  Dashboard KPI — Comparaison avant P1 vs après P1');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const fields = Object.keys(before);
    let allEqual = true;
    const rows = [];

    for (const key of fields) {
      const b = before[key];
      const a = after[key];
      const eq = Math.abs(Number(b) - Number(a)) < 0.0001;
      if (!eq) allEqual = false;
      rows.push({ field: key, before: b, after: a, status: eq ? '✅' : '❌ ÉCART' });
    }

    // Print table
    const colW = [30, 14, 14, 10];
    const header = ['Champ', 'Avant (4e4b864)', 'Après (HEAD)', 'Statut'];
    console.log(header.map((h, i) => h.padEnd(colW[i])).join('  '));
    console.log('─'.repeat(72));
    for (const row of rows) {
      const cols = [
        row.field.padEnd(colW[0]),
        String(typeof row.before === 'number' ? row.before.toFixed(2) : row.before).padEnd(colW[1]),
        String(typeof row.after === 'number' ? row.after.toFixed(2) : row.after).padEnd(colW[2]),
        row.status,
      ];
      console.log(cols.join('  '));
    }

    console.log('\n' + '─'.repeat(72));
    if (allEqual) {
      console.log('✅ PASS — aucun écart de KPI entre avant et après P1.');
    } else {
      const diffs = rows.filter(r => r.status !== '✅');
      console.log(`❌ FAIL — ${diffs.length} écart(s) détecté(s).`);
      for (const d of diffs) {
        console.log(`   ${d.field}: avant=${d.before}, après=${d.after}`);
      }
    }
    console.log('');

  } finally {
    await prisma.$disconnect();
    if (fs.existsSync(TEST_DB)) { fs.unlinkSync(TEST_DB); console.log('[TEARDOWN] Copie supprimée.'); }
  }
}

main().catch(e => {
  console.error('Erreur :', e.message);
  prisma.$disconnect().finally(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    process.exit(1);
  });
});
