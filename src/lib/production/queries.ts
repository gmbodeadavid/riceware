import { prisma } from '@/lib/db';
import {
  addDays,
  formatDate,
  isoWeekLabel,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/format';
import {
  computeBatchCost,
  computeCostPerUnit,
  computeRejectRate,
  computeYield,
  labelOf,
  PRODUCT_TYPES,
  REJECT_CAUSES,
  TEST_TYPES,
} from '@/lib/production/types';
import { getSettings, settingNumber } from '@/lib/production/settings';
import type { Prisma } from '@prisma/client';

// ─── Rizeries ──────────────────────────────────────────────────────────────

export async function listRizeries(options: { search?: string; activeOnly?: boolean } = {}) {
  const where: Prisma.RizerieWhereInput = { deletedAt: null };
  if (options.search) {
    where.OR = [
      { name: { contains: options.search } },
      { location: { contains: options.search } },
      { contactName: { contains: options.search } },
    ];
  }
  if (options.activeOnly) where.active = true;

  return prisma.rizerie.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { lots: true } },
      lots: { orderBy: { receivedAt: 'desc' }, take: 1, select: { receivedAt: true, netWeightKg: true } },
    },
  });
}

export async function getRizerie(id: string) {
  return prisma.rizerie.findUnique({
    where: { id },
    include: {
      lots: { orderBy: { receivedAt: 'desc' }, take: 20 },
      _count: { select: { lots: true } },
    },
  });
}

// ─── Lots de coques ────────────────────────────────────────────────────────

export type LotFilters = {
  search?: string;
  rizerieId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function listLots(filters: LotFilters = {}) {
  const where: Prisma.LotCoquesWhereInput = { deletedAt: null };
  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search } },
      { notes: { contains: filters.search } },
      { rizerie: { name: { contains: filters.search } } },
    ];
  }
  if (filters.rizerieId) where.rizerieId = filters.rizerieId;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.receivedAt = {};
    if (filters.from) where.receivedAt.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) where.receivedAt.lte = new Date(`${filters.to}T23:59:59.999`);
  }

  return prisma.lotCoques.findMany({
    where,
    orderBy: { receivedAt: 'desc' },
    take: filters.limit,
    include: {
      rizerie: { select: { id: true, name: true, location: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { batches: true } },
    },
  });
}

export async function getLot(id: string) {
  return prisma.lotCoques.findUnique({
    where: { id },
    include: {
      rizerie: true,
      createdBy: { select: { id: true, name: true } },
      batches: {
        orderBy: { startedAt: 'desc' },
        include: {
          operator: { select: { id: true, name: true } },
          _count: { select: { products: true, tests: true } },
        },
      },
    },
  });
}

export async function getLotByCode(code: string) {
  const lot = await prisma.lotCoques.findUnique({
    where: { code },
    include: {
      rizerie: { select: { name: true, location: true, contractType: true } },
      batches: {
        where: { deletedAt: null }, // N'exposer que les batches actifs sur la page publique
        orderBy: { startedAt: 'asc' },
        select: {
          code: true,
          startedAt: true,
          piecesProduced: true,
          rejects: true,
          products: { where: { deletedAt: null }, select: { type: true, status: true } },
        },
      },
    },
  });
  // Ne pas exposer un lot supprimé via la page publique de traçabilité
  if (lot?.deletedAt) return null;
  return lot;
}

// ─── Batches ───────────────────────────────────────────────────────────────

export type BatchFilters = {
  search?: string;
  lotId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function listBatches(filters: BatchFilters = {}) {
  const where: Prisma.BatchProductionWhereInput = { deletedAt: null };
  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search } },
      { observations: { contains: filters.search } },
      { lot: { code: { contains: filters.search } } },
    ];
  }
  if (filters.lotId) where.lotId = filters.lotId;
  if (filters.from || filters.to) {
    where.startedAt = {};
    if (filters.from) where.startedAt.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) where.startedAt.lte = new Date(`${filters.to}T23:59:59.999`);
  }

  return prisma.batchProduction.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: filters.limit,
    include: {
      lot: { select: { id: true, code: true, rizerie: { select: { name: true } } } },
      operator: { select: { id: true, name: true } },
      _count: { select: { products: true, tests: true } },
    },
  });
}

export async function getBatch(id: string) {
  return prisma.batchProduction.findUnique({
    where: { id },
    include: {
      lot: { include: { rizerie: true } },
      operator: { select: { id: true, name: true } },
      products: {
        orderBy: { createdAt: 'asc' },
        include: { tests: { orderBy: { testedAt: 'desc' } } },
      },
      tests: {
        orderBy: { testedAt: 'desc' },
        include: {
          produitFini: { select: { id: true, type: true } },
          operator: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getRecentBatches(limit = 6) {
  return prisma.batchProduction.findMany({
    where: { deletedAt: null },
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: { lot: { select: { code: true } } },
  });
}

// ─── Produits finis et tests ───────────────────────────────────────────────

export async function listProduitsFinis(options: { status?: string; batchId?: string; limit?: number } = {}) {
  const where: Prisma.ProduitFiniWhereInput = { deletedAt: null };
  if (options.status) where.status = options.status;
  if (options.batchId) where.batchId = options.batchId;

  return prisma.produitFini.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit,
    include: {
      batch: { select: { id: true, code: true } },
      _count: { select: { tests: true } },
    },
  });
}

export async function listTests(options: { typeTest?: string; result?: string; limit?: number } = {}) {
  const where: Prisma.TestQualiteWhereInput = {};
  if (options.typeTest) where.typeTest = options.typeTest;
  if (options.result) where.result = options.result;

  return prisma.testQualite.findMany({
    where,
    orderBy: { testedAt: 'desc' },
    take: options.limit ?? 100,
    include: {
      produitFini: { select: { id: true, type: true, batch: { select: { id: true, code: true } } } },
      batch: { select: { id: true, code: true } },
      operator: { select: { id: true, name: true } },
    },
  });
}

export async function getQualityOverview() {
  const [products, tests, recentTests] = await Promise.all([
    prisma.produitFini.findMany({
      where: { deletedAt: null },
      include: { batch: { select: { code: true } }, _count: { select: { tests: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.testQualite.groupBy({ by: ['result'], _count: { _all: true } }),
    listTests({ limit: 8 }),
  ]);

  const passed = tests.find((row) => row.result === 'succes')?._count._all ?? 0;
  const failed = tests.find((row) => row.result === 'echec')?._count._all ?? 0;
  const total = passed + failed;

  return {
    products,
    recentTests,
    passed,
    failed,
    passRate: total ? (passed / total) * 100 : 0,
    pendingProducts: products.filter((product) => product._count.tests === 0),
  };
}

// ─── Stocks ────────────────────────────────────────────────────────────────

export async function listStocks() {
  return prisma.stock.findMany({
    where: { deletedAt: null },
    orderBy: [{ itemType: 'asc' }, { label: 'asc' }],
    include: {
      movements: { orderBy: { createdAt: 'desc' }, take: 3, include: { createdBy: { select: { name: true } } } },
    },
  });
}

export async function listStockMovements(limit = 100) {
  return prisma.stockMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      stock: { select: { id: true, label: true, unit: true, itemType: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getStockAlerts() {
  const stocks = await prisma.stock.findMany({
    where: { deletedAt: null, minThreshold: { gt: 0 } },
    orderBy: { quantity: 'asc' },
  });
  return stocks.filter((stock) => stock.quantity <= stock.minThreshold);
}

// ─── Partenaires, documents, utilisateurs ──────────────────────────────────

export async function listPartners(options: { type?: string; search?: string } = {}) {
  const where: Prisma.PartnerWhereInput = { deletedAt: null };
  if (options.type) where.type = options.type;
  if (options.search) {
    where.OR = [
      { name: { contains: options.search } },
      { contactName: { contains: options.search } },
      { location: { contains: options.search } },
    ];
  }
  return prisma.partner.findMany({ where, orderBy: [{ active: 'desc' }, { name: 'asc' }] });
}

export async function listDocuments(options: { category?: string; limit?: number } = {}) {
  const where: Prisma.DocumentWhereInput = { deletedAt: null };
  if (options.category) where.category = options.category;
  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 100,
    include: { uploadedBy: { select: { name: true } } },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { batches: true, tests: true } },
    },
  });
}

export async function listGoals() {
  return prisma.goal.findMany({ orderBy: [{ status: 'asc' }, { endDate: 'asc' }, { createdAt: 'desc' }] });
}

export async function listNotifications(options: { unreadOnly?: boolean; limit?: number } = {}) {
  return prisma.notification.findMany({
    where: options.unreadOnly ? { read: false } : undefined,
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 30,
  });
}

export async function listAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true } } },
  });
}

// ─── Corbeille ─────────────────────────────────────────────────────────────

/** Retourne les éléments soft-deletés pour la page Administration > Éléments supprimés. */
export async function listDeletedItems() {
  const [rizeries, lots, batches, produitsFinis, stocks, partenaires, documents, clients, commandes] =
    await Promise.all([
      prisma.rizerie.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.lotCoques.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50, include: { rizerie: { select: { name: true } } } }),
      prisma.batchProduction.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.produitFini.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.stock.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.partner.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.document.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.customer.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
      prisma.order.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' }, take: 50 }),
    ]);

  return { rizeries, lots, batches, produitsFinis, stocks, partenaires, documents, clients, commandes };
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const eightWeeksAgo = addDays(startOfWeek(now), -7 * 7);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // ÉCART P1 : les commandes étaient chargées sans filtre de période (toutes les commandes).
  // Corrigé : on charge seulement les commandes non supprimées.
  // Le CA affiché ("CA encaissé") reste le CA total cumulé de toutes les commandes payées non supprimées,
  // cohérent avec le comportement précédent (il n'y avait pas de filtre temporel).
  const [batches, lots, stocks, notifications, goals, settings, orderRows, testCounts, partnerCount, rizerieCount] =
    await Promise.all([
      prisma.batchProduction.findMany({
        where: { deletedAt: null, startedAt: { gte: sixMonthsAgo } },
        orderBy: { startedAt: 'desc' },
        include: { lot: { select: { code: true } } },
      }),
      prisma.lotCoques.findMany({
        where: { deletedAt: null, receivedAt: { gte: sixMonthsAgo } },
        orderBy: { receivedAt: 'desc' },
      }),
      listStocks(),
      listNotifications({ limit: 12 }),
      listGoals(),
      getSettings(),
      // Commandes : on exclut les supprimées (soft-deleted). Pas de filtre temporel :
      // le CA cumulé total est intentionnel (voir docs/kpi-definitions.md section B1).
      prisma.order.findMany({
        where: { deletedAt: null },
        select: { status: true, paymentStatus: true, totalAmount: true, createdAt: true },
      }),
      prisma.testQualite.groupBy({ by: ['result'], _count: { _all: true } }),
      prisma.partner.count({ where: { active: true, deletedAt: null } }),
      prisma.rizerie.count({ where: { active: true, deletedAt: null } }),
    ]);

  const sum = (rows: typeof batches) =>
    rows.reduce(
      (acc, batch) => {
        acc.pieces += batch.piecesProduced;
        acc.rejects += batch.rejects;
        acc.cost += computeBatchCost(batch);
        acc.valid += Math.max(0, batch.piecesProduced - batch.rejects);
        return acc;
      },
      { pieces: 0, rejects: 0, cost: 0, valid: 0 },
    );

  const todayTotals = sum(batches.filter((batch) => batch.startedAt >= today));
  const weekTotals = sum(batches.filter((batch) => batch.startedAt >= week));
  const monthTotals = sum(batches.filter((batch) => batch.startedAt >= month));

  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = addDays(startOfWeek(now), (index - 7) * 7);
    const end = addDays(start, 7);
    const rows = batches.filter((batch) => batch.startedAt >= start && batch.startedAt < end);
    const totals = sum(rows);
    return {
      label: isoWeekLabel(start),
      pieces: totals.pieces,
      valid: totals.valid,
      rejects: totals.rejects,
      costPerUnit: totals.valid ? totals.cost / totals.valid : 0,
    };
  });

  const monthly = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 1);
    const rows = batches.filter((batch) => batch.startedAt >= start && batch.startedAt < end);
    const totals = sum(rows);
    return {
      label: start.toLocaleDateString('fr-FR', { month: 'short' }),
      pieces: totals.pieces,
      rejects: totals.rejects,
      costPerUnit: totals.valid ? totals.cost / totals.valid : 0,
    };
  });

  const causes = new Map<string, number>();
  for (const batch of batches.filter((row) => row.startedAt >= eightWeeksAgo && row.rejects > 0)) {
    const key = batch.rejectCause || 'non_renseigne';
    causes.set(key, (causes.get(key) ?? 0) + batch.rejects);
  }
  const rejectCauses = [...causes.entries()]
    .map(([cause, quantity]) => ({
      cause,
      label: cause === 'non_renseigne' ? 'Non renseigné' : labelOf(REJECT_CAUSES, cause),
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const lowStocks = stocks.filter((stock) => stock.minThreshold > 0 && stock.quantity <= stock.minThreshold);
  const activeGoal = goals.find((goal) => goal.status === 'active') ?? null;
  const greenpreneurTarget = activeGoal?.target ?? settingNumber(settings, 'greenpreneurTargetPieces', 100000);
  const totalPiecesForGoal = batches.reduce((total, batch) => total + batch.piecesProduced, 0);
  const greenpreneurProgress = greenpreneurTarget ? Math.min(100, (totalPiecesForGoal / greenpreneurTarget) * 100) : 0;

  const paidOrders = orderRows.filter((order) => order.paymentStatus === 'paid');
  const revenue = paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  const testsPassed = testCounts.find((row) => row.result === 'succes')?._count._all ?? 0;
  const testsFailed = testCounts.find((row) => row.result === 'echec')?._count._all ?? 0;
  const totalTests = testsPassed + testsFailed;

  return {
    kpis: {
      todayPieces: todayTotals.pieces,
      weekPieces: weekTotals.pieces,
      monthPieces: monthTotals.pieces,
      monthRejects: monthTotals.rejects,
      rejectRate: computeRejectRate(monthTotals.pieces, monthTotals.rejects),
      yieldRate: computeYield(monthTotals.pieces, monthTotals.rejects),
      costPerUnit: monthTotals.valid ? monthTotals.cost / monthTotals.valid : 0,
      totalCostMonth: monthTotals.cost,
      lowStockCount: lowStocks.length,
      unreadAlerts: notifications.filter((notification) => !notification.read).length,
      activeRizeries: rizerieCount,
      activePartners: partnerCount,
      revenue,
      paidOrders: paidOrders.length,
      totalOrders: orderRows.length,
      testsPassed,
      testsFailed,
      testPassRate: totalTests ? (testsPassed / totalTests) * 100 : 0,
      greenpreneurTarget,
      greenpreneurProgress,
      totalPiecesForGoal,
      totalLots: lots.length,
      totalLotsWeight: lots.reduce((total, lot) => total + lot.netWeightKg, 0),
    },
    weekly,
    monthly,
    rejectCauses,
    lowStocks,
    notifications,
    goals,
    activeGoal,
    recentBatches: batches.slice(0, 6),
    recentLots: lots.slice(0, 6),
    topCostBatches: [...batches]
      .sort((a, b) => computeCostPerUnit(b) - computeCostPerUnit(a))
      .slice(0, 5),
    lastUpdated: formatDate(now),
  };
}

// ─── Analyses ─────────────────────────────────────────────────────────────

export const ANALYTICS_RANGES = [30, 90, 180, 365] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function analyticsRangeFromParam(value?: string): AnalyticsRange {
  const parsed = Number.parseInt(value ?? '', 10);
  return (ANALYTICS_RANGES as readonly number[]).includes(parsed) ? (parsed as AnalyticsRange) : 90;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

type BatchAnalyticsRow = {
  piecesProduced: number;
  rejects: number;
  powderCostFcfa: number;
  binderCostFcfa: number;
  laborCostFcfa: number;
  energyCostFcfa: number;
};

function aggregateBatches(rows: BatchAnalyticsRow[]) {
  return rows.reduce(
    (totals, batch) => {
      totals.pieces += batch.piecesProduced;
      totals.rejects += batch.rejects;
      totals.valid += Math.max(0, batch.piecesProduced - batch.rejects);
      totals.cost += computeBatchCost(batch);
      return totals;
    },
    { pieces: 0, rejects: 0, valid: 0, cost: 0 },
  );
}

export async function getAnalyticsData(days: AnalyticsRange = 90) {
  const now = new Date();
  const from = startOfDay(addDays(now, -(days - 1)));
  const previousFrom = startOfDay(addDays(from, -days));

  const [
    batches,
    previousBatches,
    lots,
    previousLots,
    tests,
    previousTests,
    orders,
    previousOrders,
    stocks,
    activePartners,
    activeRizeries,
    activeGoal,
  ] = await Promise.all([
    prisma.batchProduction.findMany({
      where: { deletedAt: null, startedAt: { gte: from } },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        code: true,
        startedAt: true,
        productType: true,
        powderKg: true,
        binderKg: true,
        piecesProduced: true,
        rejects: true,
        rejectCause: true,
        powderCostFcfa: true,
        binderCostFcfa: true,
        laborCostFcfa: true,
        energyCostFcfa: true,
      },
    }),
    prisma.batchProduction.findMany({
      where: { deletedAt: null, startedAt: { gte: previousFrom, lt: from } },
      select: {
        piecesProduced: true,
        rejects: true,
        powderCostFcfa: true,
        binderCostFcfa: true,
        laborCostFcfa: true,
        energyCostFcfa: true,
      },
    }),
    prisma.lotCoques.findMany({
      where: { deletedAt: null, receivedAt: { gte: from } },
      orderBy: { receivedAt: 'asc' },
      select: {
        id: true,
        code: true,
        rizerieId: true,
        receivedAt: true,
        netWeightKg: true,
        status: true,
        rizerie: { select: { name: true, location: true } },
      },
    }),
    prisma.lotCoques.findMany({
      where: { deletedAt: null, receivedAt: { gte: previousFrom, lt: from } },
      select: { netWeightKg: true, status: true },
    }),
    prisma.testQualite.findMany({
      where: { testedAt: { gte: from } },
      select: { typeTest: true, result: true },
    }),
    prisma.testQualite.findMany({
      where: { testedAt: { gte: previousFrom, lt: from } },
      select: { result: true },
    }),
    prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: from } },
      select: { status: true, paymentStatus: true, totalAmount: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { deletedAt: null, createdAt: { gte: previousFrom, lt: from } },
      select: { paymentStatus: true, totalAmount: true },
    }),
    prisma.stock.findMany({ where: { deletedAt: null }, orderBy: [{ itemType: 'asc' }, { label: 'asc' }] }),
    prisma.partner.count({ where: { active: true, deletedAt: null } }),
    prisma.rizerie.count({ where: { active: true, deletedAt: null } }),
    prisma.goal.findFirst({ where: { status: 'active' }, orderBy: { createdAt: 'desc' } }),
  ]);

  const totals = aggregateBatches(batches);
  const previousTotals = aggregateBatches(previousBatches);

  const testsPassed = tests.filter((test) => test.result === 'succes').length;
  const testsFailed = tests.filter((test) => test.result === 'echec').length;
  const previousTestsPassed = previousTests.filter((test) => test.result === 'succes').length;
  const previousTestsFailed = previousTests.filter((test) => test.result === 'echec').length;
  const passRate = testsPassed + testsFailed ? (testsPassed / (testsPassed + testsFailed)) * 100 : 0;
  const previousPassRate =
    previousTestsPassed + previousTestsFailed
      ? (previousTestsPassed / (previousTestsPassed + previousTestsFailed)) * 100
      : 0;

  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const revenue = paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  const previousRevenue = previousOrders
    .filter((order) => order.paymentStatus === 'paid')
    .reduce((total, order) => total + order.totalAmount, 0);
  const acceptedLots = lots.filter((lot) => lot.status === 'accepted');
  const totalLotsWeight = acceptedLots.reduce((total, lot) => total + lot.netWeightKg, 0);
  const previousLotsWeight = previousLots
    .filter((lot) => lot.status === 'accepted')
    .reduce((total, lot) => total + lot.netWeightKg, 0);

  const trend: Array<{ label: string; pieces: number; rejects: number; valid: number; costPerUnit: number }> = [];
  if (days <= 90) {
    let cursor = startOfWeek(from);
    while (cursor <= now) {
      const end = addDays(cursor, 7);
      const bucket = batches.filter((batch) => batch.startedAt >= cursor && batch.startedAt < end);
      const bucketTotals = aggregateBatches(bucket);
      trend.push({
        label: isoWeekLabel(cursor),
        pieces: bucketTotals.pieces,
        rejects: bucketTotals.rejects,
        valid: bucketTotals.valid,
        costPerUnit: bucketTotals.valid ? bucketTotals.cost / bucketTotals.valid : 0,
      });
      cursor = end;
    }
  } else {
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= now) {
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const bucket = batches.filter((batch) => batch.startedAt >= cursor && batch.startedAt < end);
      const bucketTotals = aggregateBatches(bucket);
      trend.push({
        label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        pieces: bucketTotals.pieces,
        rejects: bucketTotals.rejects,
        valid: bucketTotals.valid,
        costPerUnit: bucketTotals.valid ? bucketTotals.cost / bucketTotals.valid : 0,
      });
      cursor = end;
    }
  }

  const productMap = new Map<string, { batches: number; pieces: number; rejects: number; cost: number }>();
  for (const batch of batches) {
    const entry = productMap.get(batch.productType) ?? { batches: 0, pieces: 0, rejects: 0, cost: 0 };
    entry.batches += 1;
    entry.pieces += batch.piecesProduced;
    entry.rejects += batch.rejects;
    entry.cost += computeBatchCost(batch);
    productMap.set(batch.productType, entry);
  }
  const productMix = [...productMap.entries()]
    .map(([type, row]) => {
      const valid = Math.max(0, row.pieces - row.rejects);
      return {
        type,
        label: labelOf(PRODUCT_TYPES, type),
        batches: row.batches,
        pieces: row.pieces,
        rejects: row.rejects,
        valid,
        yieldRate: computeYield(row.pieces, row.rejects),
        costPerUnit: valid ? row.cost / valid : 0,
      };
    })
    .sort((a, b) => b.pieces - a.pieces);

  const causeMap = new Map<string, number>();
  for (const batch of batches) {
    if (batch.rejects <= 0) continue;
    const cause = batch.rejectCause || 'non_renseigne';
    causeMap.set(cause, (causeMap.get(cause) ?? 0) + batch.rejects);
  }
  const rejectCauses = [...causeMap.entries()]
    .map(([cause, quantity]) => ({
      cause,
      label: cause === 'non_renseigne' ? 'Non renseigné' : labelOf(REJECT_CAUSES, cause),
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const qualityByType = TEST_TYPES.map((type) => {
    const rows = tests.filter((test) => test.typeTest === type.value);
    const passed = rows.filter((test) => test.result === 'succes').length;
    const failed = rows.filter((test) => test.result === 'echec').length;
    return {
      type: type.value,
      label: type.label,
      total: rows.length,
      passed,
      failed,
      passRate: rows.length ? (passed / rows.length) * 100 : 0,
    };
  });

  const rizerieMap = new Map<
    string,
    {
      id: string;
      name: string;
      location: string;
      lots: number;
      accepted: number;
      refused: number;
      weightKg: number;
      lastReceivedAt: Date;
    }
  >();
  for (const lot of lots) {
    const entry = rizerieMap.get(lot.rizerieId) ?? {
      id: lot.rizerieId,
      name: lot.rizerie.name,
      location: lot.rizerie.location,
      lots: 0,
      accepted: 0,
      refused: 0,
      weightKg: 0,
      lastReceivedAt: lot.receivedAt,
    };
    entry.lots += 1;
    if (lot.status === 'accepted') {
      entry.accepted += 1;
      entry.weightKg += lot.netWeightKg;
    } else {
      entry.refused += 1;
    }
    if (lot.receivedAt > entry.lastReceivedAt) entry.lastReceivedAt = lot.receivedAt;
    rizerieMap.set(lot.rizerieId, entry);
  }
  const rizeriePerformance = [...rizerieMap.values()].sort((a, b) => b.weightKg - a.weightKg);

  const stockHealth = stocks
    .map((stock) => {
      const status: 'rupture' | 'bas' | 'ok' =
        stock.quantity <= 0 ? 'rupture' : stock.minThreshold > 0 && stock.quantity <= stock.minThreshold ? 'bas' : 'ok';
      return {
        id: stock.id,
        label: stock.label,
        itemType: stock.itemType,
        productType: stock.productType,
        quantity: stock.quantity,
        unit: stock.unit,
        minThreshold: stock.minThreshold,
        location: stock.location,
        status,
      };
    })
    .sort((a, b) => {
      const rank = { rupture: 0, bas: 1, ok: 2 };
      return rank[a.status] - rank[b.status] || a.label.localeCompare(b.label, 'fr');
    });
  const lowStockCount = stockHealth.filter((stock) => stock.status !== 'ok').length;

  const orderStatusMap = new Map<string, { count: number; amount: number }>();
  for (const order of orders) {
    const entry = orderStatusMap.get(order.status) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += order.totalAmount;
    orderStatusMap.set(order.status, entry);
  }
  const orderPipeline = [...orderStatusMap.entries()]
    .map(([status, row]) => ({ status, ...row }))
    .sort((a, b) => b.count - a.count);

  const topCostBatches = [...batches]
    .map((batch) => ({
      id: batch.id,
      code: batch.code,
      startedAt: batch.startedAt,
      productType: batch.productType,
      productLabel: labelOf(PRODUCT_TYPES, batch.productType),
      piecesProduced: batch.piecesProduced,
      rejects: batch.rejects,
      rejectRate: computeRejectRate(batch.piecesProduced, batch.rejects),
      costPerUnit: computeCostPerUnit(batch),
    }))
    .sort((a, b) => b.costPerUnit - a.costPerUnit)
    .slice(0, 6);

  return {
    days,
    from,
    to: now,
    generatedAt: now,
    kpis: {
      pieces: totals.pieces,
      valid: totals.valid,
      rejects: totals.rejects,
      totalCost: totals.cost,
      costPerUnit: totals.valid ? totals.cost / totals.valid : 0,
      yieldRate: computeYield(totals.pieces, totals.rejects),
      rejectRate: computeRejectRate(totals.pieces, totals.rejects),
      batches: batches.length,
      lots: acceptedLots.length,
      refusedLots: lots.length - acceptedLots.length,
      totalLotsWeight,
      revenue,
      paidOrders: paidOrders.length,
      totalOrders: orders.length,
      testsPassed,
      testsFailed,
      passRate,
      lowStockCount,
      activePartners,
      activeRizeries,
    },
    comparison: {
      pieces: percentChange(totals.pieces, previousTotals.pieces),
      costPerUnit: percentChange(
        totals.valid ? totals.cost / totals.valid : 0,
        previousTotals.valid ? previousTotals.cost / previousTotals.valid : 0,
      ),
      rejectRate: computeRejectRate(totals.pieces, totals.rejects) - computeRejectRate(previousTotals.pieces, previousTotals.rejects),
      lotsWeight: percentChange(totalLotsWeight, previousLotsWeight),
      revenue: percentChange(revenue, previousRevenue),
      passRate: passRate - previousPassRate,
    },
    trend,
    productMix,
    rejectCauses,
    qualityByType,
    rizeriePerformance,
    stockHealth,
    orderPipeline,
    topCostBatches,
    activeGoal,
  };
}
